<?php

namespace Tests\Feature\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueNumberService;
use App\Services\QueueStateMachine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class QueueConcurrencyAndIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_consecutive_ticket_generation_creates_strict_sequential_numbers(): void
    {
        $service = Service::factory()->create(['prefix' => 'TRI']);
        $numberService = app(QueueNumberService::class);

        $results = [];
        for ($i = 0; $i < 20; $i++) {
            $results[] = $numberService->generate($service, '2026-10-05');
        }

        $sequences = array_column($results, 'sequence');
        $numbers = array_column($results, 'queue_number');

        $this->assertEquals(range(1, 20), $sequences);
        $this->assertEquals('TRI-001', $numbers[0]);
        $this->assertEquals('TRI-020', $numbers[19]);
    }

    public function test_state_machine_rejects_invalid_transitions(): void
    {
        $stateMachine = app(QueueStateMachine::class);
        $user = User::factory()->windowStaff()->create();
        $queue = Queue::factory()->completed()->create();

        $this->expectException(ValidationException::class);

        // Cannot move from Completed back to Serving
        $stateMachine->transition(
            queue: $queue,
            targetStatus: QueueStatus::Serving,
            eventType: QueueEventType::ServingStarted,
            user: $user
        );
    }

    public function test_state_machine_rejects_skipping_completed_tickets(): void
    {
        $stateMachine = app(QueueStateMachine::class);
        $user = User::factory()->windowStaff()->create();
        $queue = Queue::factory()->completed()->create();

        $this->expectException(ValidationException::class);

        // Cannot skip completed ticket
        $stateMachine->transition(
            queue: $queue,
            targetStatus: QueueStatus::Skipped,
            eventType: QueueEventType::Skipped,
            user: $user
        );
    }

    public function test_window_must_belong_to_department_to_call_queue(): void
    {
        $user = User::factory()->windowStaff()->create();
        $deptA = Department::factory()->create();
        $deptB = Department::factory()->create();

        $serviceA = Service::factory()->create(['department_id' => $deptA->id]);
        $windowB = Window::factory()->create(['department_id' => $deptB->id]);

        Queue::factory()->waiting()->create([
            'department_id' => $deptA->id,
            'service_id' => $serviceA->id,
        ]);

        // Window in Dept B tries to call Dept A queue
        $response = $this->actingAs($user)->post(route('queue.terminal.call-next'), [
            'window_id' => $windowB->id,
        ]);

        $response->assertRedirect();
        // No ticket should have been called for window B
        $this->assertDatabaseMissing('queues', [
            'window_id' => $windowB->id,
            'status' => QueueStatus::Called->value,
        ]);
    }
}

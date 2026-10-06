<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QueueApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_can_issue_queue_ticket(): void
    {
        $user = User::factory()->queueStaff()->create();
        $department = Department::factory()->create();
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'RAD']);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/queues', [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Emergency->value,
            'patient_name' => 'Emergency Patient 1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.queue_number', 'RAD-001')
            ->assertJsonPath('data.priority_type', 'EMERGENCY')
            ->assertJsonPath('data.status', 'waiting');
    }

    public function test_api_can_call_next_queue_and_complete(): void
    {
        $user = User::factory()->windowStaff()->create();
        $department = Department::factory()->create();
        $service = Service::factory()->create(['department_id' => $department->id]);
        $window = Window::factory()->create(['department_id' => $department->id]);

        $queue = Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
        ]);

        Sanctum::actingAs($user);

        // 1. Call Next
        $callResponse = $this->postJson('/api/queues/call-next', [
            'window_id' => $window->id,
        ]);

        $callResponse->assertOk()
            ->assertJsonPath('data.id', $queue->id)
            ->assertJsonPath('data.status', 'called');

        // 2. Start Serving
        $serveResponse = $this->postJson("/api/queues/{$queue->id}/serve", [
            'window_id' => $window->id,
        ]);

        $serveResponse->assertOk()
            ->assertJsonPath('data.status', 'serving');

        // 3. Complete
        $completeResponse = $this->postJson("/api/queues/{$queue->id}/complete", [
            'window_id' => $window->id,
        ]);

        $completeResponse->assertOk()
            ->assertJsonPath('data.status', 'completed');
    }
}

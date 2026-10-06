<?php

namespace Tests\Feature\Operations;

use App\Enums\PriorityType;
use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueControlOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_transfer_queue_to_different_department_and_service(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept1 = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service1 = Service::factory()->create(['department_id' => $dept1->id, 'is_active' => true, 'status' => 'available']);
        $dept2 = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service2 = Service::factory()->create(['department_id' => $dept2->id, 'is_active' => true, 'status' => 'available']);

        $queue = Queue::factory()->create([
            'department_id' => $dept1->id,
            'service_id' => $service1->id,
            'status' => QueueStatus::Waiting,
        ]);

        $response = $this->actingAs($admin)->post(route('operations.queues.transfer', $queue), [
            'target_department_id' => $dept2->id,
            'target_service_id' => $service2->id,
            'reason' => 'Referred for specialist laboratory examination',
        ]);

        $response->assertSessionHasNoErrors();

        // Source queue should be transferred
        $this->assertEquals(QueueStatus::Transferred, $queue->fresh()->status);
        $this->assertEquals($dept2->id, $queue->fresh()->transfer_to_department_id);
        $this->assertEquals($service2->id, $queue->fresh()->transfer_to_service_id);

        // New queue ticket should be created in waiting status for target service
        $newQueue = Queue::where('parent_queue_id', $queue->id)->first();
        $this->assertNotNull($newQueue);
        $this->assertEquals(QueueStatus::Waiting, $newQueue->status);
        $this->assertEquals($dept2->id, $newQueue->department_id);
        $this->assertEquals($service2->id, $newQueue->service_id);
    }

    public function test_administrator_can_cancel_active_queue(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true, 'status' => 'available']);
        $queue = Queue::factory()->create([
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'status' => QueueStatus::Waiting,
        ]);

        $response = $this->actingAs($admin)->post(route('operations.queues.cancel', $queue), [
            'reason' => 'Patient left hospital premises',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals(QueueStatus::Cancelled, $queue->fresh()->status);
        $this->assertDatabaseHas('queue_events', [
            'queue_id' => $queue->id,
            'event_type' => QueueEventType::Cancelled->value,
            'reason' => 'Patient left hospital premises',
        ]);
    }

    public function test_administrator_can_change_queue_priority(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true, 'status' => 'available']);
        $queue = Queue::factory()->create([
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular,
            'status' => QueueStatus::Waiting,
        ]);

        $response = $this->actingAs($admin)->post(route('operations.queues.priority', $queue), [
            'priority_type' => PriorityType::Emergency->value,
            'reason' => 'Emergency promotion due to acute breathing difficulty',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals(PriorityType::Emergency, $queue->fresh()->priority_type);
        $this->assertEquals(PriorityType::Emergency->weight(), $queue->fresh()->priority_level);

        $this->assertDatabaseHas('queue_events', [
            'queue_id' => $queue->id,
            'event_type' => QueueEventType::PriorityChanged->value,
        ]);
    }
}

<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_ticket_can_be_issued(): void
    {
        $user = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create([
            'department_id' => $department->id,
            'prefix' => 'OPD',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Senior->value,
            'patient_name' => 'Maria Santos',
            'patient_reference' => 'PAT-12345',
        ]);

        $response->assertRedirect(route('queue.tickets.create'));
        $this->assertDatabaseHas('queues', [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-001',
            'status' => QueueStatus::Waiting->value,
            'priority_type' => PriorityType::Senior->value,
            'priority_level' => 2,
            'patient_name' => 'Maria Santos',
        ]);

        $queue = Queue::where('queue_number', 'OPD-001')->first();
        $this->assertDatabaseHas('queue_events', [
            'queue_id' => $queue->id,
            'event_type' => QueueEventType::Created->value,
            'to_status' => QueueStatus::Waiting->value,
        ]);
    }

    public function test_cannot_issue_ticket_for_inactive_service(): void
    {
        $user = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->inactive()->create([
            'department_id' => $department->id,
        ]);

        $response = $this->actingAs($user)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $response->assertSessionHasErrors(['service_id']);
    }

    public function test_staff_can_call_next_patient_in_priority_order(): void
    {
        $user = User::factory()->windowStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'OPD']);
        $window = Window::factory()->create(['department_id' => $department->id, 'window_number' => '1']);

        // Create a regular patient first
        $regularQueue = Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-001',
            'queue_sequence' => 1,
            'priority_type' => PriorityType::Regular,
            'priority_level' => 5,
        ]);

        // Create an emergency patient second
        $emergencyQueue = Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-002',
            'queue_sequence' => 2,
            'priority_type' => PriorityType::Emergency,
            'priority_level' => 1,
        ]);

        // Call Next should pick emergency patient first
        $response = $this->actingAs($user)->post(route('queue.terminal.call-next'), [
            'window_id' => $window->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('queues', [
            'id' => $emergencyQueue->id,
            'status' => QueueStatus::Called->value,
            'window_id' => $window->id,
            'called_by' => $user->id,
        ]);

        // Regular patient remains waiting
        $this->assertDatabaseHas('queues', [
            'id' => $regularQueue->id,
            'status' => QueueStatus::Waiting->value,
        ]);
    }

    public function test_window_cannot_call_next_if_already_serving_patient(): void
    {
        $user = User::factory()->windowStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id]);
        $window = Window::factory()->create(['department_id' => $department->id]);

        Queue::factory()->serving()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'window_id' => $window->id,
        ]);

        Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
        ]);

        $response = $this->actingAs($user)->post(route('queue.terminal.call-next'), [
            'window_id' => $window->id,
        ]);

        $response->assertSessionHasErrors(['window']);
    }

    public function test_staff_can_recall_start_serving_and_complete_patient(): void
    {
        $user = User::factory()->windowStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id]);
        $window = Window::factory()->create(['department_id' => $department->id]);

        $queue = Queue::factory()->called()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'window_id' => $window->id,
        ]);

        // 1. Recall
        $this->actingAs($user)->post(route('queue.terminal.recall', $queue->id), [
            'window_id' => $window->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('queue_events', [
            'queue_id' => $queue->id,
            'event_type' => QueueEventType::Recalled->value,
        ]);

        // 2. Start Serving
        $this->actingAs($user)->post(route('queue.terminal.serve', $queue->id), [
            'window_id' => $window->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('queues', [
            'id' => $queue->id,
            'status' => QueueStatus::Serving->value,
            'served_by' => $user->id,
        ]);

        // 3. Complete
        $this->actingAs($user)->post(route('queue.terminal.complete', $queue->id), [
            'window_id' => $window->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('queues', [
            'id' => $queue->id,
            'status' => QueueStatus::Completed->value,
            'completed_by' => $user->id,
        ]);
    }

    public function test_staff_can_skip_patient(): void
    {
        $user = User::factory()->windowStaff()->create();
        $queue = Queue::factory()->called()->create();

        $response = $this->actingAs($user)->post(route('queue.terminal.skip', $queue->id), [
            'reason' => 'Patient did not show up after 3 calls',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('queues', [
            'id' => $queue->id,
            'status' => QueueStatus::Skipped->value,
        ]);
        $this->assertDatabaseHas('queue_events', [
            'queue_id' => $queue->id,
            'event_type' => QueueEventType::Skipped->value,
        ]);
    }

    public function test_staff_can_hold_and_resume_patient(): void
    {
        $user = User::factory()->windowStaff()->create();
        $department = Department::factory()->create();
        $window = Window::factory()->create(['department_id' => $department->id]);
        $queue = Queue::factory()->serving()->create([
            'department_id' => $department->id,
            'window_id' => $window->id,
        ]);

        // Put on Hold
        $this->actingAs($user)->post(route('queue.terminal.hold', $queue->id), [
            'reason' => 'Sent for blood test',
        ])->assertRedirect();

        $this->assertDatabaseHas('queues', [
            'id' => $queue->id,
            'status' => QueueStatus::Hold->value,
        ]);

        // Resume
        $this->actingAs($user)->post(route('queue.terminal.resume', $queue->id), [
            'window_id' => $window->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('queues', [
            'id' => $queue->id,
            'status' => QueueStatus::Serving->value,
        ]);
    }

    public function test_staff_can_transfer_patient_to_another_service(): void
    {
        $user = User::factory()->windowStaff()->create();
        $opdDept = Department::factory()->create(['is_active' => true]);
        $opdService = Service::factory()->create(['department_id' => $opdDept->id, 'prefix' => 'OPD']);

        $labDept = Department::factory()->create(['is_active' => true]);
        $labService = Service::factory()->create(['department_id' => $labDept->id, 'prefix' => 'LAB']);

        $sourceQueue = Queue::factory()->serving()->create([
            'department_id' => $opdDept->id,
            'service_id' => $opdService->id,
            'queue_number' => 'OPD-005',
            'priority_type' => PriorityType::Senior,
            'patient_name' => 'John Doe',
        ]);

        $response = $this->actingAs($user)->post(route('queue.terminal.transfer', $sourceQueue->id), [
            'target_department_id' => $labDept->id,
            'target_service_id' => $labService->id,
            'reason' => 'Referred for CBC and Lipid Profile',
        ]);

        $response->assertRedirect();

        // Source queue should be transferred
        $this->assertDatabaseHas('queues', [
            'id' => $sourceQueue->id,
            'status' => QueueStatus::Transferred->value,
            'transfer_to_department_id' => $labDept->id,
            'transfer_to_service_id' => $labService->id,
        ]);

        // New child queue ticket created in LAB service retaining original queue number & carrying over senior priority & patient name
        $this->assertDatabaseHas('queues', [
            'department_id' => $labDept->id,
            'service_id' => $labService->id,
            'queue_number' => 'OPD-005',
            'status' => QueueStatus::Waiting->value,
            'priority_type' => PriorityType::Senior->value,
            'patient_name' => 'John Doe',
            'parent_queue_id' => $sourceQueue->id,
        ]);
    }
}

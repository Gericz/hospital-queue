<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_issue_patient_queue_ticket(): void
    {
        $staff = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['code' => 'OPD', 'is_active' => true]);
        $service = Service::factory()->create([
            'department_id' => $department->id,
            'prefix' => 'OPD',
            'is_active' => true,
        ]);

        $response = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Senior->value,
            'patient_name' => 'Juan Dela Cruz',
            'patient_reference' => 'MRN-100234',
            'notes' => 'Patient has follow-up laboratory results',
        ]);

        $response->assertRedirect(route('queue.tickets.create'));

        $this->assertDatabaseHas('queues', [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-001',
            'status' => QueueStatus::Waiting->value,
            'priority_type' => PriorityType::Senior->value,
            'patient_name' => 'Juan Dela Cruz',
            'patient_reference' => 'MRN-100234',
        ]);

        $queue = Queue::where('queue_number', 'OPD-001')->first();
        $this->assertNotNull($queue->public_token);
        $this->assertEquals(32, strlen($queue->public_token));
    }

    public function test_service_must_belong_to_the_selected_department(): void
    {
        $staff = User::factory()->queueStaff()->create();
        $deptA = Department::factory()->create(['is_active' => true]);
        $deptB = Department::factory()->create(['is_active' => true]);
        $serviceB = Service::factory()->create(['department_id' => $deptB->id, 'is_active' => true]);

        $response = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $deptA->id,
            'service_id' => $serviceB->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $response->assertSessionHasErrors(['service_id']);
    }

    public function test_inactive_department_or_service_is_rejected(): void
    {
        $staff = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['is_active' => false]);
        $service = Service::factory()->create(['department_id' => $department->id, 'is_active' => false]);

        $response = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $response->assertSessionHasErrors(['department_id', 'service_id']);
    }
}

<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Models\Department;
use App\Models\QueueSetting;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KioskQueueCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_user_can_obtain_ticket_from_kiosk(): void
    {
        $department = Department::factory()->create(['code' => 'OPD', 'is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'OPD', 'is_active' => true]);

        $response = $this->post(route('kiosk.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
            'patient_name' => 'Kiosk Patient',
        ]);

        $response->assertRedirect(route('kiosk'));

        $this->assertDatabaseHas('queues', [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-001',
            'patient_name' => 'Kiosk Patient',
        ]);
    }

    public function test_kiosk_api_endpoint_issues_ticket_with_token_and_safe_data(): void
    {
        $department = Department::factory()->create(['code' => 'LAB', 'is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'LAB', 'is_active' => true]);

        $response = $this->postJson('/api/queue-tickets', [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Senior->value,
            'patient_name' => 'Senior Patient',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.queue_number', 'LAB-001')
            ->assertJsonPath('data.priority_type', 'SENIOR')
            ->assertJsonStructure([
                'data' => [
                    'public_token',
                    'queue_number',
                    'department_name',
                    'service_name',
                    'hospital',
                ],
            ]);
    }

    public function test_kiosk_rejects_emergency_priority_when_restricted(): void
    {
        QueueSetting::getSettings()->update(['allow_kiosk_emergency' => false]);

        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'is_active' => true]);

        // Unauthenticated public kiosk tries to request emergency
        $response = $this->post(route('kiosk.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Emergency->value,
        ]);

        $response->assertSessionHasErrors(['priority_type']);
    }

    public function test_staff_can_issue_emergency_priority_ticket(): void
    {
        QueueSetting::getSettings()->update(['allow_kiosk_emergency' => false]);

        $staff = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'is_active' => true]);

        $response = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Emergency->value,
            'patient_name' => 'Emergency Triage Patient',
        ]);

        $response->assertRedirect(route('queue.tickets.create'));
        $this->assertDatabaseHas('queues', [
            'priority_type' => PriorityType::Emergency->value,
            'priority_level' => 1,
        ]);
    }
}

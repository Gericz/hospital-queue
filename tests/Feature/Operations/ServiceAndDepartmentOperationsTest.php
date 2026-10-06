<?php

namespace Tests\Feature\Operations;

use App\Enums\DepartmentStatus;
use App\Enums\PriorityType;
use App\Enums\ServiceStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\ServiceOperatingHour;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceAndDepartmentOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_department_status_blocks_new_tickets_when_closed(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true, 'status' => 'available']);

        // 1. Close Department
        $response = $this->actingAs($admin)->post(route('operations.departments.status', $dept), [
            'status' => DepartmentStatus::Closed->value,
            'status_reason' => 'Closed for hospital-wide system maintenance',
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertEquals(DepartmentStatus::Closed, $dept->fresh()->status);

        // 2. Attempt ticket issuance while department is closed
        $staff = User::factory()->queueStaff()->create();
        $issueResponse = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $issueResponse->assertSessionHasErrors('department_id');
    }

    public function test_updating_service_status_blocks_new_tickets_when_maintenance_or_paused(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true, 'status' => 'available']);

        // 1. Set service to Maintenance
        $response = $this->actingAs($admin)->post(route('operations.services.status', $service), [
            'status' => ServiceStatus::Maintenance->value,
            'status_reason' => 'X-Ray machine undergoing recalibration',
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertEquals(ServiceStatus::Maintenance, $service->fresh()->status);

        // 2. Attempt ticket issuance
        $staff = User::factory()->queueStaff()->create();
        $issueResponse = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $issueResponse->assertSessionHasErrors('service_id');
    }

    public function test_weekly_operating_hours_schedule_enforcement(): void
    {
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true, 'status' => 'available']);

        $currentDay = Carbon::now()->dayOfWeekIso; // 1 to 7

        // Create operating hours schedule for current day as closed
        ServiceOperatingHour::create([
            'service_id' => $service->id,
            'day_of_week' => $currentDay,
            'open_time' => '08:00:00',
            'close_time' => '17:00:00',
            'is_enabled' => false,
        ]);

        $staff = User::factory()->queueStaff()->create();
        $issueResponse = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $issueResponse->assertSessionHasErrors('service_id');
    }

    public function test_max_waiting_queue_capacity_limit(): void
    {
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create([
            'department_id' => $dept->id,
            'is_active' => true,
            'status' => 'available',
            'max_waiting_queue' => 2,
        ]);

        $staff = User::factory()->queueStaff()->create();
        $today = Carbon::today()->format('Y-m-d');

        // Create 2 waiting tickets
        Queue::factory()->count(2)->create([
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'queue_date' => $today,
            'status' => 'waiting',
        ]);

        // Attempt to create 3rd ticket
        $issueResponse = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $issueResponse->assertSessionHasErrors('service_id');
    }
}

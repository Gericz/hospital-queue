<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceAvailabilityAndLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_rejects_queue_creation_when_daily_capacity_limit_is_reached(): void
    {
        $staff = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create([
            'department_id' => $department->id,
            'max_daily_queue' => 2,
            'is_active' => true,
        ]);

        $today = Carbon::today()->format('Y-m-d');

        // Existing 2 tickets issued today
        Queue::factory()->count(2)->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_date' => $today,
        ]);

        // Attempting to issue a 3rd ticket
        $response = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $response->assertSessionHasErrors(['service_id']);
    }

    public function test_service_rejects_queue_creation_outside_operating_hours(): void
    {
        $staff = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);

        // Set operating hours in the future (e.g. 18:00 to 20:00) while test runs at noon
        $service = Service::factory()->create([
            'department_id' => $department->id,
            'open_time' => '18:00:00',
            'close_time' => '20:00:00',
            'is_active' => true,
        ]);

        Carbon::setTestNow(Carbon::createFromTime(12, 0, 0));

        $response = $this->actingAs($staff)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
        ]);

        $response->assertSessionHasErrors(['service_id']);
        Carbon::setTestNow();
    }

    public function test_administrator_can_update_queue_settings(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->patch(route('settings.queue.update'), [
            'hospital_name' => 'St. Jude General Hospital',
            'hospital_tagline' => 'Compassionate Medical Care',
            'ticket_header' => 'St. Jude Medical',
            'ticket_footer' => 'Thank you for choosing St. Jude.',
            'ticket_width' => '58mm',
            'show_patient_name_on_ticket' => true,
            'allow_kiosk_emergency' => true,
            'kiosk_idle_timeout' => 20,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('queue_settings', [
            'hospital_name' => 'St. Jude General Hospital',
            'ticket_width' => '58mm',
            'show_patient_name_on_ticket' => true,
            'allow_kiosk_emergency' => true,
            'kiosk_idle_timeout' => 20,
        ]);
    }
}

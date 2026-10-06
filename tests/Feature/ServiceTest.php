<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_services_list(): void
    {
        $user = User::factory()->queueStaff()->create();
        Service::factory()->count(3)->create();

        $response = $this->actingAs($user)->get(route('services.index'));

        $response->assertOk();
    }

    public function test_administrator_can_create_service(): void
    {
        $admin = User::factory()->hospitalAdmin()->create();
        $department = Department::factory()->create();

        $response = $this->actingAs($admin)->post(route('services.store'), [
            'department_id' => $department->id,
            'code' => 'OPD-GEN',
            'name' => 'General Consultation',
            'description' => 'First consultation and triage',
            'prefix' => 'A',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('services.index'));
        $this->assertDatabaseHas('services', [
            'department_id' => $department->id,
            'code' => 'OPD-GEN',
            'name' => 'General Consultation',
            'prefix' => 'A',
            'is_active' => true,
        ]);
    }

    public function test_service_code_must_be_unique(): void
    {
        $admin = User::factory()->queueAdmin()->create();
        $department = Department::factory()->create();
        Service::factory()->create(['code' => 'OPD-GEN']);

        $response = $this->actingAs($admin)->post(route('services.store'), [
            'department_id' => $department->id,
            'code' => 'OPD-GEN',
            'name' => 'Duplicate Consultation',
            'prefix' => 'B',
        ]);

        $response->assertSessionHasErrors('code');
    }

    public function test_service_requires_valid_department(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->post(route('services.store'), [
            'department_id' => 99999,
            'code' => 'NEW-SRV',
            'name' => 'Invalid Department Service',
            'prefix' => 'X',
        ]);

        $response->assertSessionHasErrors('department_id');
    }

    public function test_administrator_can_update_service(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $department = Department::factory()->create();
        $service = Service::factory()->create(['department_id' => $department->id]);

        $response = $this->actingAs($admin)->put(route('services.update', $service), [
            'department_id' => $department->id,
            'code' => 'SRV-UPDATED',
            'name' => 'Updated Service Name',
            'prefix' => 'U',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('services.index'));
        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'code' => 'SRV-UPDATED',
            'name' => 'Updated Service Name',
            'prefix' => 'U',
        ]);
    }

    public function test_administrator_can_toggle_service_status(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $service = Service::factory()->create(['is_active' => true]);

        $response = $this->actingAs($admin)->patch(route('services.toggle-status', $service));

        $response->assertSessionHasNoErrors();
        $this->assertFalse($service->fresh()->is_active);
    }
}

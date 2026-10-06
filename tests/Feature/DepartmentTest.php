<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_departments_list(): void
    {
        $user = User::factory()->create();
        Department::factory()->count(3)->create();

        $response = $this->actingAs($user)->get(route('departments.index'));

        $response->assertOk();
    }

    public function test_administrator_can_create_department(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->post(route('departments.store'), [
            'code' => 'OPD',
            'name' => 'Outpatient Department',
            'description' => 'Outpatient care',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('departments.index'));
        $this->assertDatabaseHas('departments', [
            'code' => 'OPD',
            'name' => 'Outpatient Department',
        ]);
    }

    public function test_department_code_must_be_unique(): void
    {
        $admin = User::factory()->superAdmin()->create();
        Department::factory()->create(['code' => 'OPD']);

        $response = $this->actingAs($admin)->post(route('departments.store'), [
            'code' => 'OPD',
            'name' => 'Another Department',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors(['code']);
    }

    public function test_administrator_can_update_department(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['code' => 'OPD', 'name' => 'Old Name']);

        $response = $this->actingAs($admin)->put(route('departments.update', $dept), [
            'code' => 'OPD',
            'name' => 'Updated Name',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('departments.index'));
        $this->assertDatabaseHas('departments', [
            'id' => $dept->id,
            'name' => 'Updated Name',
        ]);
    }

    public function test_administrator_can_toggle_department_status(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true]);

        $response = $this->actingAs($admin)->patch(route('departments.toggle-status', $dept));

        $response->assertRedirect();
        $this->assertDatabaseHas('departments', [
            'id' => $dept->id,
            'is_active' => false,
        ]);
    }
}

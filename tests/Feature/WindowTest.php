<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WindowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_windows_list(): void
    {
        $user = User::factory()->queueStaff()->create();
        Window::factory()->count(3)->create();

        $response = $this->actingAs($user)->get(route('windows.index'));

        $response->assertOk();
    }

    public function test_administrator_can_create_window(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $department = Department::factory()->create();

        $response = $this->actingAs($admin)->post(route('windows.store'), [
            'department_id' => $department->id,
            'window_number' => 1,
            'name' => 'Consultation Window 1',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('windows.index'));
        $this->assertDatabaseHas('windows', [
            'department_id' => $department->id,
            'window_number' => 1,
            'name' => 'Consultation Window 1',
            'is_active' => true,
        ]);
    }

    public function test_cannot_create_duplicate_window_number_in_same_department(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $department = Department::factory()->create();
        Window::factory()->create([
            'department_id' => $department->id,
            'window_number' => 1,
        ]);

        $response = $this->actingAs($admin)->post(route('windows.store'), [
            'department_id' => $department->id,
            'window_number' => 1,
            'name' => 'Duplicate Window 1',
        ]);

        $response->assertSessionHasErrors('window_number');
    }

    public function test_can_create_same_window_number_in_different_departments(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept1 = Department::factory()->create();
        $dept2 = Department::factory()->create();

        Window::factory()->create([
            'department_id' => $dept1->id,
            'window_number' => 1,
        ]);

        $response = $this->actingAs($admin)->post(route('windows.store'), [
            'department_id' => $dept2->id,
            'window_number' => 1,
            'name' => 'Different Dept Window 1',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('windows.index'));
        $this->assertDatabaseHas('windows', [
            'department_id' => $dept2->id,
            'window_number' => 1,
        ]);
    }

    public function test_administrator_can_toggle_window_status(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $window = Window::factory()->create(['is_active' => true]);

        $response = $this->actingAs($admin)->patch(route('windows.toggle-status', $window));

        $response->assertSessionHasNoErrors();
        $this->assertFalse($window->fresh()->is_active);
    }
}

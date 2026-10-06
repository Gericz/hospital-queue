<?php

namespace Tests\Feature\Operations;

use App\Enums\WindowAssignmentStatus;
use App\Enums\WindowStatus;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use App\Models\WindowAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WindowOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_open_close_pause_and_resume_window(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true]);
        $window = Window::factory()->create([
            'department_id' => $dept->id,
            'is_active' => true,
            'status' => WindowStatus::Closed,
        ]);

        // 1. Open Window
        $response = $this->actingAs($admin)->post(route('operations.windows.status', $window), [
            'status' => WindowStatus::Open->value,
            'service_id' => $service->id,
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertEquals(WindowStatus::Open, $window->fresh()->status);
        $this->assertEquals($service->id, $window->fresh()->service_id);

        // 2. Pause Window
        $response = $this->actingAs($admin)->post(route('operations.windows.status', $window), [
            'status' => WindowStatus::Paused->value,
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertEquals(WindowStatus::Paused, $window->fresh()->status);

        // 3. Resume Window (back to Open)
        $response = $this->actingAs($admin)->post(route('operations.windows.status', $window), [
            'status' => WindowStatus::Open->value,
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertEquals(WindowStatus::Open, $window->fresh()->status);

        // 4. Close Window
        $response = $this->actingAs($admin)->post(route('operations.windows.status', $window), [
            'status' => WindowStatus::Closed->value,
        ]);
        $response->assertSessionHasNoErrors();
        $this->assertEquals(WindowStatus::Closed, $window->fresh()->status);
    }

    public function test_staff_can_be_assigned_and_unassigned_from_window(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true]);
        $window = Window::factory()->create(['department_id' => $dept->id, 'is_active' => true, 'status' => WindowStatus::Closed]);
        $staff = User::factory()->queueStaff()->create();

        // Assign Staff
        $response = $this->actingAs($admin)->post(route('operations.windows.assign', $window), [
            'user_id' => $staff->id,
            'open_window' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('window_assignments', [
            'window_id' => $window->id,
            'user_id' => $staff->id,
            'status' => WindowAssignmentStatus::Active->value,
        ]);
        $this->assertEquals(WindowStatus::Open, $window->fresh()->status);

        // Unassign Staff
        $response = $this->actingAs($admin)->post(route('operations.windows.unassign', $window), [
            'close_window' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('window_assignments', [
            'window_id' => $window->id,
            'user_id' => $staff->id,
            'status' => WindowAssignmentStatus::Ended->value,
        ]);
        $this->assertEquals(WindowStatus::Closed, $window->fresh()->status);
    }

    public function test_reassigning_staff_ends_previous_active_assignments_cleanly(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true]);
        $window1 = Window::factory()->create(['department_id' => $dept->id, 'is_active' => true]);
        $window2 = Window::factory()->create(['department_id' => $dept->id, 'is_active' => true]);
        $staff = User::factory()->windowStaff()->create();

        // Assign to window 1
        $this->actingAs($admin)->post(route('operations.windows.assign', $window1), [
            'user_id' => $staff->id,
        ]);

        $this->assertEquals(1, WindowAssignment::where('user_id', $staff->id)->where('status', 'active')->count());

        // Assign same staff to window 2
        $this->actingAs($admin)->post(route('operations.windows.assign', $window2), [
            'user_id' => $staff->id,
        ]);

        // Staff should only have 1 active assignment (at window 2)
        $this->assertEquals(1, WindowAssignment::where('user_id', $staff->id)->where('status', 'active')->count());
        $this->assertEquals($window2->id, $staff->fresh()->activeWindowAssignment->window_id);
    }
}

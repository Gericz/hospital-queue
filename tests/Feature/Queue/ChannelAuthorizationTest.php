<?php

namespace Tests\Feature\Queue;

use App\Models\Department;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

class ChannelAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_staff_can_access_department_channel(): void
    {
        $staff = User::factory()->windowStaff()->create(['is_active' => true]);
        $department = Department::factory()->create(['is_active' => true]);

        $channels = Broadcast::getChannels();
        $callback = $channels->get('department.{departmentId}');

        $this->assertNotNull($callback);
        $this->assertTrue((bool) $callback($staff, $department->id));
    }

    public function test_unauthorized_or_inactive_user_cannot_access_department_channel(): void
    {
        $inactiveStaff = User::factory()->windowStaff()->inactive()->create();
        $department = Department::factory()->create(['is_active' => true]);

        $channels = Broadcast::getChannels();
        $callback = $channels->get('department.{departmentId}');

        $this->assertFalse((bool) $callback($inactiveStaff, $department->id));
    }

    public function test_non_queue_staff_cannot_access_department_channel(): void
    {
        $displayUser = User::factory()->displayUser()->create(['is_active' => true]);
        $department = Department::factory()->create(['is_active' => true]);

        $channels = Broadcast::getChannels();
        $callback = $channels->get('department.{departmentId}');

        $this->assertFalse((bool) $callback($displayUser, $department->id));
    }

    public function test_authorized_staff_can_access_window_channel(): void
    {
        $staff = User::factory()->windowStaff()->create(['is_active' => true]);
        $window = Window::factory()->create(['is_active' => true]);

        $channels = Broadcast::getChannels();
        $callback = $channels->get('window.{windowId}');

        $this->assertNotNull($callback);
        $this->assertTrue((bool) $callback($staff, $window->id));
    }

    public function test_inactive_staff_cannot_access_window_channel(): void
    {
        $inactiveStaff = User::factory()->windowStaff()->inactive()->create();
        $window = Window::factory()->create(['is_active' => true]);

        $channels = Broadcast::getChannels();
        $callback = $channels->get('window.{windowId}');

        $this->assertFalse((bool) $callback($inactiveStaff, $window->id));
    }

    public function test_supervisor_can_access_queue_monitor_channel(): void
    {
        $admin = User::factory()->queueAdmin()->create(['is_active' => true]);
        $displayUser = User::factory()->displayUser()->create(['is_active' => true]);

        $channels = Broadcast::getChannels();
        $callback = $channels->get('queue-monitor');

        $this->assertNotNull($callback);
        $this->assertTrue((bool) $callback($admin));
        $this->assertFalse((bool) $callback($displayUser));
    }
}

<?php

namespace Tests\Feature\Analytics;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_and_hospital_admin_can_view_analytics_and_export(): void
    {
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin, 'is_active' => true]);
        $hospitalAdmin = User::factory()->create(['role' => UserRole::HospitalAdmin, 'is_active' => true]);
        $queueAdmin = User::factory()->create(['role' => UserRole::QueueAdmin, 'is_active' => true]);

        $this->actingAs($superAdmin)->get(route('analytics.dashboard'))->assertOk();
        $this->actingAs($hospitalAdmin)->get(route('analytics.dashboard'))->assertOk();
        $this->actingAs($queueAdmin)->get(route('analytics.dashboard'))->assertOk();

        $this->actingAs($superAdmin)->get(route('analytics.export', ['report_type' => 'summary', 'format' => 'csv']))->assertOk();
    }

    public function test_staff_cannot_export_reports(): void
    {
        $queueStaff = User::factory()->create(['role' => UserRole::QueueStaff, 'is_active' => true]);
        $windowStaff = User::factory()->create(['role' => UserRole::WindowStaff, 'is_active' => true]);

        // Staff can view dashboard
        $this->actingAs($queueStaff)->get(route('analytics.dashboard'))->assertOk();
        $this->actingAs($windowStaff)->get(route('analytics.dashboard'))->assertOk();

        // Staff cannot export
        $this->actingAs($queueStaff)->get(route('analytics.export', ['report_type' => 'summary']))->assertForbidden();
        $this->actingAs($windowStaff)->get(route('analytics.export', ['report_type' => 'summary']))->assertForbidden();
    }

    public function test_display_user_cannot_access_analytics(): void
    {
        $displayUser = User::factory()->create(['role' => UserRole::DisplayUser, 'is_active' => true]);

        $this->actingAs($displayUser)->get(route('analytics.dashboard'))->assertForbidden();
    }

    public function test_unauthenticated_guests_are_redirected_to_login(): void
    {
        $this->get(route('analytics.dashboard'))->assertRedirect(route('login'));
    }
}

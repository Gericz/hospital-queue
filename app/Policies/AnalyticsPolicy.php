<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\User;

class AnalyticsPolicy
{
    /**
     * Determine whether the user can view analytics dashboard.
     */
    public function view(User $user): bool
    {
        if (! $user->is_active) {
            return false;
        }

        return in_array($user->role, [
            UserRole::SuperAdmin,
            UserRole::HospitalAdmin,
            UserRole::QueueAdmin,
            UserRole::QueueStaff,
            UserRole::WindowStaff,
        ], true);
    }

    /**
     * Determine whether the user can export reports (CSV, PDF).
     */
    public function export(User $user): bool
    {
        if (! $user->is_active) {
            return false;
        }

        return in_array($user->role, [
            UserRole::SuperAdmin,
            UserRole::HospitalAdmin,
            UserRole::QueueAdmin,
        ], true);
    }

    /**
     * Determine whether the user can view hospital-wide cross-department analytics.
     */
    public function viewHospitalWide(User $user): bool
    {
        if (! $user->is_active) {
            return false;
        }

        return in_array($user->role, [
            UserRole::SuperAdmin,
            UserRole::HospitalAdmin,
            UserRole::QueueAdmin,
        ], true);
    }

    /**
     * Determine whether the user can view specific department analytics.
     */
    public function viewDepartment(User $user, ?Department $department = null): bool
    {
        if (! $user->is_active) {
            return false;
        }

        // Administrators have full access across departments
        if (in_array($user->role, [UserRole::SuperAdmin, UserRole::HospitalAdmin, UserRole::QueueAdmin], true)) {
            return true;
        }

        // Staff can view department if permitted or no specific restriction
        return in_array($user->role, [UserRole::QueueStaff, UserRole::WindowStaff], true);
    }
}

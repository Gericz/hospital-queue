<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Window;

class WindowPolicy
{
    /**
     * Determine whether the user can view any windows.
     */
    public function viewAny(User $user): bool
    {
        return (bool) $user->is_active;
    }

    /**
     * Determine whether the user can view the window.
     */
    public function view(User $user, Window $window): bool
    {
        return (bool) $user->is_active;
    }

    /**
     * Determine whether the user can create windows.
     */
    public function create(User $user): bool
    {
        return $user->is_active && $user->canManageMasterData();
    }

    /**
     * Determine whether the user can update the window.
     */
    public function update(User $user, Window $window): bool
    {
        return $user->is_active && $user->canManageMasterData();
    }

    /**
     * Determine whether the user can delete the window.
     */
    public function delete(User $user, Window $window): bool
    {
        return $user->is_active && $user->canManageMasterData();
    }

    /**
     * Determine whether the user can open, close, pause, or resume the window.
     */
    public function operate(User $user, Window $window): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($user->role->isAdministrator()) {
            return true;
        }

        return $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can assign or unassign staff to the window.
     */
    public function assign(User $user, Window $window): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($user->role->isAdministrator()) {
            return true;
        }

        return $user->role->canManageQueues();
    }
}

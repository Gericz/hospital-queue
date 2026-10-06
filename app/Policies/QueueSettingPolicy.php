<?php

namespace App\Policies;

use App\Models\User;

class QueueSettingPolicy
{
    /**
     * Determine whether the user can manage queue settings.
     */
    public function manage(User $user): bool
    {
        return $user->is_active && $user->role->isAdministrator();
    }
}

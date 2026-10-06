<?php

namespace App\Policies;

use App\Models\Queue;
use App\Models\User;

class QueuePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Queue $queue): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can call/manage queue actions.
     */
    public function manage(User $user): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can transfer a queue ticket.
     */
    public function transfer(User $user, Queue $queue): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can cancel a queue ticket.
     */
    public function cancel(User $user, Queue $queue): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can change priority.
     */
    public function changePriority(User $user, Queue $queue): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can promote to emergency priority.
     */
    public function promoteEmergency(User $user, Queue $queue): bool
    {
        return $user->is_active && $user->role->canManageQueues();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Queue $queue): bool
    {
        return $user->is_active && $user->role->isAdministrator();
    }
}

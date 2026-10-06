<?php

use App\Models\Department;
use App\Models\User;
use App\Models\Window;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int|string $id) {
    return (int) $user->id === (int) $id;
});

// Authorized staff can listen to their department's queue updates
Broadcast::channel('department.{departmentId}', function (User $user, int|string $departmentId) {
    if (! $user->is_active || ! $user->role->canManageQueues()) {
        return false;
    }

    return Department::where('id', (int) $departmentId)->where('is_active', true)->exists();
});

// Authorized staff can listen to their window/counter queue updates
Broadcast::channel('window.{windowId}', function (User $user, int|string $windowId) {
    if (! $user->is_active || ! $user->role->canManageQueues()) {
        return false;
    }

    return Window::where('id', (int) $windowId)->where('is_active', true)->exists();
});

// Queue monitor channel for administrators and authorized supervisors
Broadcast::channel('queue-monitor', function (User $user) {
    return $user->is_active && $user->role->canManageQueues();
});

// Operations board channel for administrators and queue supervisors
Broadcast::channel('operations', function (User $user) {
    return $user->is_active && $user->role->canManageQueues();
});

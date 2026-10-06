<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\WindowAssignmentStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
        ];
    }

    /**
     * Check if user has a specific role.
     */
    public function hasRole(UserRole|string $role): bool
    {
        $roleValue = $role instanceof UserRole ? $role->value : $role;

        return $this->role?->value === $roleValue || $this->role === $role;
    }

    /**
     * Check if user has any of the given roles.
     *
     * @param  array<UserRole|string>  $roles
     */
    public function hasAnyRole(array $roles): bool
    {
        foreach ($roles as $role) {
            if ($this->hasRole($role)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has administrator privileges.
     */
    public function isAdministrator(): bool
    {
        return $this->role instanceof UserRole && $this->role->isAdministrator();
    }

    /**
     * Check if user can manage master data (departments, services, windows).
     */
    public function canManageMasterData(): bool
    {
        return $this->role instanceof UserRole && $this->role->canManageMasterData();
    }

    /**
     * Window assignments for this staff user.
     */
    public function windowAssignments(): HasMany
    {
        return $this->hasMany(WindowAssignment::class)->orderBy('assigned_at', 'desc');
    }

    /**
     * Currently active window assignment for this user.
     */
    public function activeWindowAssignment(): HasOne
    {
        return $this->hasOne(WindowAssignment::class)
            ->where('status', WindowAssignmentStatus::Active);
    }
}

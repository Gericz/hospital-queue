<?php

namespace App\Models;

use App\Enums\DepartmentStatus;
use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'description', 'status', 'status_reason', 'target_wait_time_minutes', 'is_active'])]
class Department extends Model
{
    /** @use HasFactory<DepartmentFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => DepartmentStatus::class,
            'target_wait_time_minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Check if department is currently operational.
     */
    public function isOpen(): bool
    {
        return $this->is_active && $this->status === DepartmentStatus::Open;
    }

    /**
     * Services belonging to this department.
     */
    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    /**
     * Windows belonging to this department.
     */
    public function windows(): HasMany
    {
        return $this->hasMany(Window::class);
    }

    /**
     * Queues created for this department.
     */
    public function queues(): HasMany
    {
        return $this->hasMany(Queue::class);
    }
}

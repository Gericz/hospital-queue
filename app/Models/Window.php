<?php

namespace App\Models;

use App\Enums\WindowAssignmentStatus;
use App\Enums\WindowStatus;
use Database\Factories\WindowFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

#[Fillable(['department_id', 'service_id', 'window_number', 'name', 'display_name', 'status', 'is_active', 'last_activity_at'])]
class Window extends Model
{
    /** @use HasFactory<WindowFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'department_id' => 'integer',
            'service_id' => 'integer',
            'window_number' => 'integer',
            'status' => WindowStatus::class,
            'is_active' => 'boolean',
            'last_activity_at' => 'datetime',
        ];
    }

    /**
     * Department this window belongs to.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Service currently assigned to this window.
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Queues served by this window.
     */
    public function queues(): HasMany
    {
        return $this->hasMany(Queue::class);
    }

    /**
     * All staff assignments for this window.
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(WindowAssignment::class)->orderBy('assigned_at', 'desc');
    }

    /**
     * Current active staff assignment.
     */
    public function activeAssignment(): HasOne
    {
        return $this->hasOne(WindowAssignment::class)
            ->where('status', WindowAssignmentStatus::Active);
    }

    /**
     * Current active assigned staff member.
     */
    public function currentStaff(): HasOneThrough
    {
        return $this->hasOneThrough(
            User::class,
            WindowAssignment::class,
            'window_id',
            'id',
            'id',
            'user_id'
        )->where('window_assignments.status', WindowAssignmentStatus::Active->value);
    }

    /**
     * Current queue being served or called.
     */
    public function currentQueue(): HasOne
    {
        return $this->hasOne(Queue::class)
            ->whereIn('status', ['serving', 'called'])
            ->latest('updated_at');
    }

    /**
     * Operational state check.
     */
    public function isOpen(): bool
    {
        return $this->is_active && $this->status === WindowStatus::Open;
    }

    public function isPaused(): bool
    {
        return $this->status === WindowStatus::Paused;
    }

    public function isClosed(): bool
    {
        return ! $this->is_active || $this->status === WindowStatus::Closed || $this->status === WindowStatus::Offline;
    }
}

<?php

namespace App\Models;

use App\Enums\WindowAssignmentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['window_id', 'user_id', 'assigned_by', 'assigned_at', 'ended_at', 'status'])]
class WindowAssignment extends Model
{
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'window_id' => 'integer',
            'user_id' => 'integer',
            'assigned_by' => 'integer',
            'assigned_at' => 'datetime',
            'ended_at' => 'datetime',
            'status' => WindowAssignmentStatus::class,
        ];
    }

    /**
     * Window this assignment is for.
     */
    public function window(): BelongsTo
    {
        return $this->belongsTo(Window::class);
    }

    /**
     * Staff member assigned.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Admin/Staff who made the assignment.
     */
    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}

<?php

namespace App\Models;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use Database\Factories\QueueFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'public_token',
    'department_id',
    'service_id',
    'window_id',
    'parent_queue_id',
    'queue_date',
    'queue_number',
    'queue_sequence',
    'display_number',
    'status',
    'priority_type',
    'priority_level',
    'patient_name',
    'patient_reference',
    'phone_number',
    'sms_consent',
    'sms_notifications_enabled',
    'notes',
    'called_at',
    'started_at',
    'completed_at',
    'skipped_at',
    'held_at',
    'transferred_at',
    'transfer_to_department_id',
    'transfer_to_service_id',
    'created_by',
    'called_by',
    'served_by',
    'completed_by',
])]
class Queue extends Model
{
    /** @use HasFactory<QueueFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (self $queue) {
            if (empty($queue->public_token)) {
                $queue->public_token = Str::random(32);
            }
        });
    }

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
            'window_id' => 'integer',
            'parent_queue_id' => 'integer',
            'queue_date' => 'date:Y-m-d',
            'queue_sequence' => 'integer',
            'status' => QueueStatus::class,
            'priority_type' => PriorityType::class,
            'priority_level' => 'integer',
            'called_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'skipped_at' => 'datetime',
            'held_at' => 'datetime',
            'transferred_at' => 'datetime',
            'transfer_to_department_id' => 'integer',
            'transfer_to_service_id' => 'integer',
            'sms_consent' => 'boolean',
            'sms_notifications_enabled' => 'boolean',
            'created_by' => 'integer',
            'called_by' => 'integer',
            'served_by' => 'integer',
            'completed_by' => 'integer',
        ];
    }

    /**
     * Department this ticket belongs to.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Service this ticket is for.
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Window currently serving or assigned to this ticket.
     */
    public function window(): BelongsTo
    {
        return $this->belongsTo(Window::class);
    }

    /**
     * Parent queue ticket if transferred.
     */
    public function parentQueue(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_queue_id');
    }

    /**
     * Child tickets generated upon transfer.
     */
    public function childQueues(): HasMany
    {
        return $this->hasMany(self::class, 'parent_queue_id');
    }

    /**
     * Target department if transferred.
     */
    public function transferToDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'transfer_to_department_id');
    }

    /**
     * Target service if transferred.
     */
    public function transferToService(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'transfer_to_service_id');
    }

    /**
     * User who created/issued the ticket.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who called the ticket to a window.
     */
    public function caller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'called_by');
    }

    /**
     * User who started serving the ticket.
     */
    public function server(): BelongsTo
    {
        return $this->belongsTo(User::class, 'served_by');
    }

    /**
     * User who completed the ticket.
     */
    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * Notification audit logs sent for this queue ticket.
     */
    public function notificationLogs(): HasMany
    {
        return $this->hasMany(NotificationLog::class)->orderBy('id', 'desc');
    }

    /**
     * Event audit logs for this queue.
     */
    public function events(): HasMany
    {
        return $this->hasMany(QueueEvent::class)->orderBy('id', 'asc');
    }
}

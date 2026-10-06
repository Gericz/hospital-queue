<?php

namespace App\Models;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'queue_id',
    'window_id',
    'user_id',
    'event_type',
    'from_status',
    'to_status',
    'reason',
    'payload',
])]
class QueueEvent extends Model
{
    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'queue_id' => 'integer',
            'window_id' => 'integer',
            'user_id' => 'integer',
            'event_type' => QueueEventType::class,
            'from_status' => QueueStatus::class,
            'to_status' => QueueStatus::class,
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Queue ticket this event belongs to.
     */
    public function queue(): BelongsTo
    {
        return $this->belongsTo(Queue::class);
    }

    /**
     * Window associated with this event.
     */
    public function window(): BelongsTo
    {
        return $this->belongsTo(Window::class);
    }

    /**
     * Staff user who triggered this event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

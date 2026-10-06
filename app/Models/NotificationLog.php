<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'queue_id',
    'channel',
    'notification_type',
    'recipient',
    'raw_recipient',
    'status',
    'provider',
    'provider_message_id',
    'message_body',
    'idempotency_key',
    'attempts',
    'error_message',
    'metadata',
    'sent_at',
    'failed_at',
])]
class NotificationLog extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'metadata' => 'array',
            'sent_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    /**
     * Relationship to Queue.
     */
    public function queue(): BelongsTo
    {
        return $this->belongsTo(Queue::class);
    }

    /**
     * Helper to mask phone number for admin/audit display (e.g. 09******123).
     */
    public static function maskPhoneNumber(?string $number): ?string
    {
        if (! $number) {
            return null;
        }

        $clean = preg_replace('/[^0-9]/', '', $number);
        $len = strlen($clean);

        if ($len <= 4) {
            return str_repeat('*', $len);
        }

        $visibleStart = 2;
        $visibleEnd = 3;

        if ($len < 7) {
            return substr($clean, 0, 1).str_repeat('*', $len - 2).substr($clean, -1);
        }

        return substr($clean, 0, $visibleStart).str_repeat('*', $len - ($visibleStart + $visibleEnd)).substr($clean, -$visibleEnd);
    }
}

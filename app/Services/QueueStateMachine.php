<?php

namespace App\Services;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Models\Queue;
use App\Models\QueueEvent;
use App\Models\User;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class QueueStateMachine
{
    /**
     * Define valid state transitions.
     *
     * @var array<string, array<string>>
     */
    protected array $allowedTransitions = [
        'waiting' => ['called', 'transferred', 'cancelled'],
        'called' => ['called', 'serving', 'skipped', 'hold', 'transferred', 'cancelled'],
        'serving' => ['completed', 'skipped', 'hold', 'transferred', 'cancelled'],
        'hold' => ['serving', 'called', 'transferred', 'cancelled'],
        'skipped' => [],
        'completed' => [],
        'transferred' => [],
        'cancelled' => [],
    ];

    /**
     * Transition a queue to a new status and record the audit event.
     *
     * @param  array<string, mixed>|null  $payload
     *
     * @throws ValidationException
     */
    public function transition(
        Queue $queue,
        QueueStatus $targetStatus,
        QueueEventType $eventType,
        ?User $user = null,
        ?Window $window = null,
        ?string $reason = null,
        ?array $payload = null
    ): Queue {
        $currentStatus = $queue->status;

        // Verify if transition is valid
        if (! $this->canTransition($currentStatus, $targetStatus)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot transition queue #{$queue->queue_number} from '{$currentStatus->value}' to '{$targetStatus->value}'."],
            ]);
        }

        $now = Carbon::now();
        $queue->status = $targetStatus;

        if ($window) {
            $queue->window_id = $window->id;
        }

        // Update timestamps & staff references based on target status & event
        match ($targetStatus) {
            QueueStatus::Called => (function () use ($queue, $now, $user) {
                $queue->called_at = $now;
                if ($user) {
                    $queue->called_by = $user->id;
                }
            })(),
            QueueStatus::Serving => (function () use ($queue, $now, $user) {
                if (! $queue->started_at) {
                    $queue->started_at = $now;
                }
                if ($user) {
                    $queue->served_by = $user->id;
                }
            })(),
            QueueStatus::Completed => (function () use ($queue, $now, $user) {
                $queue->completed_at = $now;
                if ($user) {
                    $queue->completed_by = $user->id;
                }
            })(),
            QueueStatus::Skipped => (function () use ($queue, $now) {
                $queue->skipped_at = $now;
            })(),
            QueueStatus::Hold => (function () use ($queue, $now) {
                $queue->held_at = $now;
            })(),
            QueueStatus::Transferred => (function () use ($queue, $now) {
                $queue->transferred_at = $now;
            })(),
            default => null,
        };

        $queue->save();

        // Create audit event log
        QueueEvent::create([
            'queue_id' => $queue->id,
            'window_id' => $window?->id ?? $queue->window_id,
            'user_id' => $user?->id,
            'event_type' => $eventType,
            'from_status' => $currentStatus,
            'to_status' => $targetStatus,
            'reason' => $reason,
            'payload' => $payload,
        ]);

        return $queue;
    }

    /**
     * Check if status transition is permissible.
     */
    public function canTransition(QueueStatus $from, QueueStatus $to): bool
    {
        $allowed = $this->allowedTransitions[$from->value] ?? [];

        return in_array($to->value, $allowed, true);
    }
}

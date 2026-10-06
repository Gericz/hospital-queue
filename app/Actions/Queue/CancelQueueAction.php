<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueCancelled;
use App\Models\Queue;
use App\Models\User;
use App\Services\QueueStateMachine;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    public function execute(Queue $queue, User $user, ?string $reason = null): Queue
    {
        if ($queue->status->isTerminal()) {
            throw ValidationException::withMessages([
                'queue' => "Queue #{$queue->queue_number} is already in terminal status '{$queue->status->value}' and cannot be cancelled.",
            ]);
        }

        $cancelledQueue = DB::transaction(function () use ($queue, $user, $reason) {
            $this->stateMachine->transition(
                queue: $queue,
                targetStatus: QueueStatus::Cancelled,
                eventType: QueueEventType::Cancelled,
                user: $user,
                window: $queue->window,
                reason: $reason,
                payload: [
                    'cancelled_by' => $user->id,
                    'cancelled_at' => now()->toIso8601String(),
                    'reason' => $reason,
                ]
            );

            return $queue->load(['department', 'service', 'window']);
        });

        event(new QueueCancelled($cancelledQueue, $reason));

        return $cancelledQueue;
    }
}

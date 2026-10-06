<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueHeld;
use App\Models\Queue;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueStateMachine;
use Illuminate\Support\Facades\DB;

class HoldQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    public function execute(Queue $queue, User $user, ?Window $window = null, ?string $reason = null): Queue
    {
        $heldQueue = DB::transaction(function () use ($queue, $user, $window, $reason) {
            $activeWindow = $window ?: $queue->window;

            $this->stateMachine->transition(
                queue: $queue,
                targetStatus: QueueStatus::Hold,
                eventType: QueueEventType::Held,
                user: $user,
                window: $activeWindow,
                reason: $reason,
                payload: [
                    'reason' => $reason,
                    'held_at' => now()->toIso8601String(),
                ]
            );

            $queue->held_at = now();
            $queue->save();

            return $queue->load(['department', 'service', 'window', 'caller', 'server']);
        });

        event(new QueueHeld($heldQueue, $window ?: $heldQueue->window, $reason));

        return $heldQueue;
    }
}

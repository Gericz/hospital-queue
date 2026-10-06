<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueSkipped;
use App\Models\Queue;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueStateMachine;
use Illuminate\Support\Facades\DB;

class SkipQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    public function execute(Queue $queue, User $user, ?Window $window = null, ?string $reason = null): Queue
    {
        $skippedQueue = DB::transaction(function () use ($queue, $user, $window, $reason) {
            $activeWindow = $window ?: $queue->window;

            $this->stateMachine->transition(
                queue: $queue,
                targetStatus: QueueStatus::Skipped,
                eventType: QueueEventType::Skipped,
                user: $user,
                window: $activeWindow,
                reason: $reason,
                payload: [
                    'reason' => $reason,
                    'skipped_at' => now()->toIso8601String(),
                ]
            );

            $queue->skipped_at = now();
            $queue->save();

            return $queue->load(['department', 'service', 'window', 'caller', 'server']);
        });

        event(new QueueSkipped($skippedQueue, $window ?: $skippedQueue->window, $reason));

        return $skippedQueue;
    }
}

<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueCompleted;
use App\Models\Queue;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueStateMachine;
use Illuminate\Support\Facades\DB;

class CompleteQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    public function execute(Queue $queue, User $user, ?Window $window = null): Queue
    {
        $completedQueue = DB::transaction(function () use ($queue, $user, $window) {
            $activeWindow = $window ?: $queue->window;

            $this->stateMachine->transition(
                queue: $queue,
                targetStatus: QueueStatus::Completed,
                eventType: QueueEventType::Completed,
                user: $user,
                window: $activeWindow,
                payload: [
                    'completed_at' => now()->toIso8601String(),
                ]
            );

            $queue->completed_at = now();
            $queue->completed_by = $user->id;
            $queue->save();

            return $queue->load(['department', 'service', 'window', 'caller', 'server', 'completer']);
        });

        event(new QueueCompleted($completedQueue, $window ?: $completedQueue->window));

        return $completedQueue;
    }
}

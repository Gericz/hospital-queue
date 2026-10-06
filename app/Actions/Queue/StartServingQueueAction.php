<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueStarted;
use App\Models\Queue;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueStateMachine;
use Illuminate\Support\Facades\DB;

class StartServingQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    public function execute(Queue $queue, User $user, ?Window $window = null): Queue
    {
        $startedQueue = DB::transaction(function () use ($queue, $user, $window) {
            $assignedWindow = $window ?: $queue->window;

            $this->stateMachine->transition(
                queue: $queue,
                targetStatus: QueueStatus::Serving,
                eventType: QueueEventType::ServingStarted,
                user: $user,
                window: $assignedWindow,
                payload: [
                    'started_at' => now()->toIso8601String(),
                ]
            );

            $queue->started_at = now();
            $queue->served_by = $user->id;
            if ($assignedWindow) {
                $queue->window_id = $assignedWindow->id;
            }
            $queue->save();

            return $queue->load(['department', 'service', 'window', 'caller', 'server']);
        });

        event(new QueueStarted($startedQueue, $window ?: $startedQueue->window));

        return $startedQueue;
    }
}

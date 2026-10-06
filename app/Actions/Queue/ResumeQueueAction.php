<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueResumed;
use App\Models\Queue;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueStateMachine;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResumeQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    public function execute(Queue $queue, User $user, Window $window): Queue
    {
        if ($queue->status !== QueueStatus::Hold) {
            throw ValidationException::withMessages([
                'queue' => "Only tickets on 'Hold' status can be resumed.",
            ]);
        }

        if (! $window->is_active) {
            throw ValidationException::withMessages([
                'window_id' => 'The selected window counter is currently inactive.',
            ]);
        }

        $resumedQueue = DB::transaction(function () use ($queue, $user, $window) {
            $this->stateMachine->transition(
                queue: $queue,
                targetStatus: QueueStatus::Serving,
                eventType: QueueEventType::Resumed,
                user: $user,
                window: $window,
                payload: [
                    'resumed_at' => now()->toIso8601String(),
                    'window_id' => $window->id,
                ]
            );

            $queue->window_id = $window->id;
            $queue->served_by = $user->id;
            $queue->save();

            return $queue->load(['department', 'service', 'window', 'caller', 'server']);
        });

        event(new QueueResumed($resumedQueue, $window));

        return $resumedQueue;
    }
}

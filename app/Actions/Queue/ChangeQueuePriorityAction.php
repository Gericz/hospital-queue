<?php

namespace App\Actions\Queue;

use App\Enums\PriorityType;
use App\Enums\QueueEventType;
use App\Events\Queue\QueuePriorityChanged;
use App\Models\Queue;
use App\Models\QueueEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChangeQueuePriorityAction
{
    public function execute(Queue $queue, User $user, PriorityType $newPriority, ?string $reason = null): Queue
    {
        if ($queue->status->isTerminal()) {
            throw ValidationException::withMessages([
                'queue' => "Cannot modify priority of a queue in terminal status '{$queue->status->value}'.",
            ]);
        }

        $previousPriority = $queue->priority_type;

        if ($previousPriority === $newPriority) {
            return $queue;
        }

        // Emergency requires authorized staff
        if ($newPriority === PriorityType::Emergency && ! $user->role->canManageQueues()) {
            throw ValidationException::withMessages([
                'priority_type' => 'You are not authorized to assign Emergency priority.',
            ]);
        }

        $updatedQueue = DB::transaction(function () use ($queue, $user, $previousPriority, $newPriority, $reason) {
            $queue->priority_type = $newPriority;
            $queue->priority_level = $newPriority->weight();
            $queue->save();

            QueueEvent::create([
                'queue_id' => $queue->id,
                'window_id' => $queue->window_id,
                'user_id' => $user->id,
                'event_type' => QueueEventType::PriorityChanged,
                'from_status' => $queue->status,
                'to_status' => $queue->status,
                'reason' => $reason ?? "Priority changed from {$previousPriority->label()} to {$newPriority->label()}",
                'payload' => [
                    'previous_priority' => $previousPriority->value,
                    'new_priority' => $newPriority->value,
                    'changed_by' => $user->id,
                    'changed_by_name' => $user->name,
                    'reason' => $reason,
                ],
            ]);

            return $queue->load(['department', 'service', 'window']);
        });

        event(new QueuePriorityChanged($updatedQueue, $previousPriority, $newPriority, $reason));

        return $updatedQueue;
    }
}

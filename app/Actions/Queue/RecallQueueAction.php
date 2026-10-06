<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueRecalled;
use App\Models\Queue;
use App\Models\QueueEvent;
use App\Models\User;
use App\Models\Window;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecallQueueAction
{
    public function execute(Queue $queue, User $user, ?Window $window = null): Queue
    {
        if ($queue->status !== QueueStatus::Called && $queue->status !== QueueStatus::Serving) {
            throw ValidationException::withMessages([
                'queue' => "Cannot recall ticket {$queue->queue_number} in '{$queue->status->label()}' state.",
            ]);
        }

        $recallCount = 1;

        $recalledQueue = DB::transaction(function () use ($queue, $user, $window, &$recallCount) {
            $currentWindow = $window ?: $queue->window;

            // Count previous recalls
            $previousRecalls = QueueEvent::where('queue_id', $queue->id)
                ->where('event_type', QueueEventType::Recalled)
                ->count();

            $recallCount = $previousRecalls + 1;

            QueueEvent::create([
                'queue_id' => $queue->id,
                'event_type' => QueueEventType::Recalled,
                'from_status' => $queue->status,
                'to_status' => $queue->status,
                'window_id' => $currentWindow?->id,
                'user_id' => $user->id,
                'payload' => [
                    'recall_count' => $recallCount,
                    'recalled_at' => now()->toIso8601String(),
                ],
            ]);

            $queue->called_at = now();
            $queue->save();

            return $queue->load(['department', 'service', 'window', 'caller', 'server']);
        });

        event(new QueueRecalled($recalledQueue, $window ?: $recalledQueue->window, $recallCount));

        return $recalledQueue;
    }
}

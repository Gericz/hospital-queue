<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueSkipped;
use App\Models\Queue;
use App\Models\QueueSetting;
use App\Services\QueueStateMachine;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AutoSkipQueuesAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    /**
     * Scan and auto-skip called queues that exceeded timeout.
     *
     * @return Collection<int, Queue>
     */
    public function execute(?int $overrideTimeoutMinutes = null): Collection
    {
        $settings = QueueSetting::getSettings();
        $timeoutMinutes = $overrideTimeoutMinutes ?? $settings->auto_skip_timeout_minutes;

        if ($timeoutMinutes <= 0) {
            return collect();
        }

        $cutoffTime = Carbon::now()->subMinutes($timeoutMinutes);

        $expiredQueues = Queue::where('status', QueueStatus::Called)
            ->whereNotNull('called_at')
            ->where('called_at', '<=', $cutoffTime)
            ->with(['department', 'service', 'window'])
            ->get();

        $skipped = collect();

        foreach ($expiredQueues as $queue) {
            $skippedQueue = DB::transaction(function () use ($queue, $timeoutMinutes) {
                $this->stateMachine->transition(
                    queue: $queue,
                    targetStatus: QueueStatus::Skipped,
                    eventType: QueueEventType::AutoSkipped,
                    user: null,
                    window: $queue->window,
                    reason: "Auto-skipped after {$timeoutMinutes} minutes without response.",
                    payload: [
                        'auto_skipped' => true,
                        'timeout_minutes' => $timeoutMinutes,
                        'called_at' => $queue->called_at?->toIso8601String(),
                        'skipped_at' => now()->toIso8601String(),
                    ]
                );

                return $queue;
            });

            event(new QueueSkipped($skippedQueue, $queue->window));
            $skipped->push($skippedQueue);
        }

        return $skipped;
    }
}

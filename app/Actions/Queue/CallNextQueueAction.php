<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueCalled;
use App\Models\Queue;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueStateMachine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CallNextQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine
    ) {}

    /**
     * Call the next eligible patient ticket for the specified window.
     *
     * @param  int|null  $serviceId  Optional specific service filter within the window's department
     */
    public function execute(Window $window, User $user, ?int $serviceId = null, ?string $queueDate = null): ?Queue
    {
        if (! $window->is_active) {
            throw ValidationException::withMessages([
                'window_id' => 'The selected window counter is currently inactive.',
            ]);
        }

        $date = $queueDate ? Carbon::parse($queueDate)->format('Y-m-d') : Carbon::today()->format('Y-m-d');

        $nextQueue = DB::transaction(function () use ($window, $user, $serviceId, $date) {
            // Check if this window currently has an active called or serving ticket
            $activeTicketAtWindow = Queue::where('window_id', $window->id)
                ->whereDate('queue_date', $date)
                ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
                ->lockForUpdate()
                ->first();

            if ($activeTicketAtWindow) {
                throw ValidationException::withMessages([
                    'window' => "Window '{$window->name}' already has an active patient ticket ({$activeTicketAtWindow->queue_number}) in '{$activeTicketAtWindow->status->label()}' state. Please complete, hold, or skip the current ticket before calling the next patient.",
                ]);
            }

            // Find next eligible WAITING queue in the window's department
            $eligible = Queue::where('department_id', $window->department_id)
                ->whereDate('queue_date', $date)
                ->where('status', QueueStatus::Waiting->value)
                ->when($serviceId, fn ($q) => $q->where('service_id', $serviceId))
                ->orderBy('priority_level', 'asc')
                ->orderBy('queue_sequence', 'asc')
                ->lockForUpdate()
                ->first();

            if (! $eligible) {
                return null;
            }

            $this->stateMachine->transition(
                queue: $eligible,
                targetStatus: QueueStatus::Called,
                eventType: QueueEventType::Called,
                user: $user,
                window: $window,
                payload: [
                    'window_number' => $window->window_number,
                    'window_name' => $window->name,
                    'caller_name' => $user->name,
                ]
            );

            $eligible->called_at = now();
            $eligible->called_by = $user->id;
            $eligible->window_id = $window->id;
            $eligible->save();

            return $eligible->load(['department', 'service', 'window', 'caller']);
        });

        if ($nextQueue) {
            event(new QueueCalled($nextQueue, $window));
        }

        return $nextQueue;
    }
}

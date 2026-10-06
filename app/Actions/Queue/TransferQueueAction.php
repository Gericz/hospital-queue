<?php

namespace App\Actions\Queue;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueCreated;
use App\Events\Queue\QueueTransferred;
use App\Models\Department;
use App\Models\Queue;
use App\Models\QueueEvent;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use App\Services\QueueNumberService;
use App\Services\QueueStateMachine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TransferQueueAction
{
    public function __construct(
        protected QueueStateMachine $stateMachine,
        protected QueueNumberService $numberService
    ) {}

    /**
     * @param  array{target_department_id: int, target_service_id: int, target_window_id?: ?int, reason?: ?string}  $data
     * @return array{source_queue: Queue, new_queue: Queue}
     */
    public function execute(Queue $queue, User $user, array $data): array
    {
        $targetDepartment = Department::findOrFail($data['target_department_id']);
        $targetService = Service::findOrFail($data['target_service_id']);
        $targetWindow = ! empty($data['target_window_id']) ? Window::findOrFail($data['target_window_id']) : null;

        if (! $targetDepartment->is_active || ! $targetDepartment->isOpen()) {
            throw ValidationException::withMessages([
                'target_department_id' => 'The target department is currently closed or inactive.',
            ]);
        }

        if (! $targetService->is_active || ! $targetService->isAvailable()) {
            throw ValidationException::withMessages([
                'target_service_id' => 'The target service is currently unavailable or inactive.',
            ]);
        }

        if ($targetService->department_id !== $targetDepartment->id) {
            throw ValidationException::withMessages([
                'target_service_id' => 'The target service does not belong to the selected target department.',
            ]);
        }

        if ($targetWindow && $targetWindow->department_id !== $targetDepartment->id) {
            throw ValidationException::withMessages([
                'target_window_id' => 'The target window does not belong to the selected target department.',
            ]);
        }

        $reason = $data['reason'] ?? null;

        [$sourceQueue, $newQueue] = DB::transaction(function () use ($queue, $user, $targetDepartment, $targetService, $targetWindow, $reason) {
            $this->stateMachine->transition(
                queue: $queue,
                targetStatus: QueueStatus::Transferred,
                eventType: QueueEventType::Transferred,
                user: $user,
                window: $queue->window,
                reason: $reason,
                payload: [
                    'source_department_id' => $queue->department_id,
                    'source_service_id' => $queue->service_id,
                    'source_window_id' => $queue->window_id,
                    'target_department_id' => $targetDepartment->id,
                    'target_service_id' => $targetService->id,
                    'target_window_id' => $targetWindow?->id,
                    'transferred_by' => $user->id,
                    'reason' => $reason,
                ]
            );

            $originalPublicToken = $queue->public_token;

            // Archive the source queue's public token so that the active transferred queue inherits the exact token for live QR tracking
            if ($originalPublicToken) {
                $queue->public_token = $originalPublicToken.'_transferred_'.$queue->id;
            }

            $queue->transfer_to_department_id = $targetDepartment->id;
            $queue->transfer_to_service_id = $targetService->id;
            $queue->transferred_at = Carbon::now();
            $queue->save();

            // Next sequence in target service for queue order
            $today = Carbon::today()->format('Y-m-d');
            $maxSeq = DB::table('queues')
                ->where('service_id', $targetService->id)
                ->whereDate('queue_date', $today)
                ->max('queue_sequence');
            $nextSequence = ($maxSeq ?? 0) + 1;

            // Retain the exact same queue number, display number, patient info, and QR tracking token
            $newQueue = Queue::create([
                'public_token' => $originalPublicToken ?: Str::random(32),
                'queue_date' => $today,
                'queue_number' => $queue->queue_number,
                'queue_sequence' => $nextSequence,
                'display_number' => $queue->display_number ?: $queue->queue_number,
                'department_id' => $targetDepartment->id,
                'service_id' => $targetService->id,
                'window_id' => $targetWindow?->id,
                'parent_queue_id' => $queue->id,
                'status' => QueueStatus::Waiting,
                'priority_type' => $queue->priority_type,
                'priority_level' => $queue->priority_level,
                'patient_name' => $queue->patient_name,
                'patient_reference' => $queue->patient_reference,
                'phone_number' => $queue->phone_number,
                'sms_consent' => (bool) ($queue->sms_consent ?? false),
                'sms_notifications_enabled' => (bool) ($queue->sms_notifications_enabled ?? false),
                'notes' => "Transferred from {$queue->department?->name} ({$queue->service?->name})".($reason ? ": {$reason}" : ''),
                'created_by' => $user->id,
            ]);

            QueueEvent::create([
                'queue_id' => $newQueue->id,
                'event_type' => QueueEventType::Created,
                'from_status' => null,
                'to_status' => QueueStatus::Waiting,
                'user_id' => $user->id,
                'reason' => "Transferred from ticket {$queue->queue_number}",
                'payload' => [
                    'parent_queue_id' => $queue->id,
                    'transferred_from' => $queue->queue_number,
                    'source_department_id' => $queue->department_id,
                    'source_service_id' => $queue->service_id,
                    'source_window_id' => $queue->window_id,
                    'target_window_id' => $targetWindow?->id,
                    'reason' => $reason,
                ],
            ]);

            return [
                $queue->load(['department', 'service', 'window', 'transferToDepartment', 'transferToService']),
                $newQueue->load(['department', 'service', 'window', 'parentQueue']),
            ];
        });

        // Broadcast events
        event(new QueueTransferred($sourceQueue, $newQueue, $reason));
        event(new QueueCreated($newQueue));

        return [
            'source_queue' => $sourceQueue,
            'new_queue' => $newQueue,
        ];
    }
}

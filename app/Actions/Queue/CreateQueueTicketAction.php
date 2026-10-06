<?php

namespace App\Actions\Queue;

use App\Enums\PriorityType;
use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Events\Queue\QueueCreated;
use App\Models\Department;
use App\Models\Queue;
use App\Models\QueueEvent;
use App\Models\QueueSetting;
use App\Models\Service;
use App\Models\User;
use App\Services\QueueNumberService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateQueueTicketAction
{
    public function __construct(
        protected QueueNumberService $numberService
    ) {}

    /**
     * @param  array{
     *     department_id: int,
     *     service_id: int,
     *     priority_type?: string|PriorityType,
     *     patient_reference?: ?string,
     *     patient_name?: ?string,
     *     notes?: ?string,
     *     queue_date?: ?string,
     * }  $data
     */
    public function execute(array $data, ?User $creator = null): Queue
    {
        $department = Department::findOrFail($data['department_id']);
        $service = Service::findOrFail($data['service_id']);
        $settings = QueueSetting::getSettings();

        if (! $department->is_active) {
            throw ValidationException::withMessages([
                'department_id' => 'The selected department is currently inactive.',
            ]);
        }

        if (! $service->is_active) {
            throw ValidationException::withMessages([
                'service_id' => 'The selected service is currently inactive.',
            ]);
        }

        if ($service->department_id !== $department->id) {
            throw ValidationException::withMessages([
                'service_id' => 'The selected service does not belong to the specified department.',
            ]);
        }

        // 1. Department operational state check
        if (! $department->isOpen() && ! $settings->allow_registration_when_closed) {
            $reason = $department->status_reason ? " ({$department->status_reason})" : '';
            throw ValidationException::withMessages([
                'department_id' => "Department '{$department->name}' is currently {$department->status->label()}{$reason}.",
            ]);
        }

        // 2. Service operational availability check
        if (! $service->isAvailable() && ! $settings->allow_registration_when_closed) {
            $reason = $service->status_reason ? " ({$service->status_reason})" : '';
            throw ValidationException::withMessages([
                'service_id' => "Service '{$service->name}' is currently {$service->status->label()}{$reason}.",
            ]);
        }

        $queueDate = $data['queue_date'] ?? Carbon::today()->toDateString();

        // 3. Capacity limit check (Daily & Waiting)
        if ($service->hasReachedDailyLimit($queueDate)) {
            throw ValidationException::withMessages([
                'service_id' => "Queue is currently full for service '{$service->name}'. Daily limit reached.",
            ]);
        }

        if ($service->hasReachedWaitingLimit($queueDate)) {
            throw ValidationException::withMessages([
                'service_id' => "Waiting area is currently at maximum capacity for service '{$service->name}'. Please wait a few moments.",
            ]);
        }

        // 4. Operating hours check
        if (! $service->isWithinOperatingHours() && ! $settings->allow_registration_when_closed) {
            throw ValidationException::withMessages([
                'service_id' => "Service '{$service->name}' is currently closed for the day or outside operating hours.",
            ]);
        }

        // 5. Priority processing & authorization check
        $priorityType = $data['priority_type'] ?? PriorityType::Regular;
        if (is_string($priorityType)) {
            $priorityType = PriorityType::tryFrom(strtoupper($priorityType)) ?? PriorityType::Regular;
        }

        if ($priorityType === PriorityType::Emergency) {
            $isAuthorizedStaff = $creator && $creator->is_active && $creator->role->canManageQueues();

            if (! $isAuthorizedStaff && ! $settings->allow_kiosk_emergency) {
                throw ValidationException::withMessages([
                    'priority_type' => 'Emergency priority classification requires verification by authorized registration staff.',
                ]);
            }
        }

        $queue = DB::transaction(function () use ($department, $service, $priorityType, $data, $queueDate, $creator) {
            $generated = $this->numberService->generate($service, $queueDate);

            $newQueue = Queue::create([
                'public_token' => Str::random(32),
                'queue_date' => $generated['date'],
                'queue_number' => $generated['queue_number'],
                'queue_sequence' => $generated['sequence'],
                'display_number' => $generated['display_number'],
                'department_id' => $department->id,
                'service_id' => $service->id,
                'status' => QueueStatus::Waiting,
                'priority_type' => $priorityType,
                'priority_level' => $priorityType->weight(),
                'patient_reference' => isset($data['patient_reference']) ? trim($data['patient_reference']) : null,
                'patient_name' => isset($data['patient_name']) ? trim($data['patient_name']) : null,
                'phone_number' => ! empty($data['phone_number']) ? trim($data['phone_number']) : null,
                'sms_consent' => (bool) ($data['sms_consent'] ?? false),
                'sms_notifications_enabled' => ((bool) ($data['sms_consent'] ?? false)) && ! empty($data['phone_number']),
                'notes' => isset($data['notes']) ? trim($data['notes']) : null,
                'created_by' => $creator?->id,
            ]);

            QueueEvent::create([
                'queue_id' => $newQueue->id,
                'event_type' => QueueEventType::Created,
                'from_status' => null,
                'to_status' => QueueStatus::Waiting,
                'user_id' => $creator?->id,
                'payload' => [
                    'source' => $creator ? 'staff_desk' : 'patient_kiosk',
                    'priority' => $priorityType->value,
                    'prefix' => $service->prefix,
                ],
            ]);

            return $newQueue->load(['department', 'service']);
        });

        // Broadcast event after database commit
        event(new QueueCreated($queue));

        return $queue;
    }
}

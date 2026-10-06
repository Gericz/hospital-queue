<?php

namespace App\Listeners\Queue;

use App\Events\Queue\QueueCalled;
use App\Events\Queue\QueueCompleted;
use App\Events\Queue\QueueCreated;
use App\Events\Queue\QueueTransferred;
use App\Services\Notification\SmsNotificationService;
use Exception;
use Illuminate\Support\Facades\Log;

class QueueSmsNotificationListener
{
    public function __construct(
        protected SmsNotificationService $smsService
    ) {}

    /**
     * Handle QueueCalled event.
     */
    public function handleQueueCalled(QueueCalled $event): void
    {
        try {
            $queue = $event->queue;
            $windowName = $event->window?->name ?? $queue->window?->name ?? 'Assigned Window';

            // 1. Send SMS to called patient
            $this->smsService->dispatchQueueNotification(
                $queue,
                'called',
                ['window_name' => $windowName, 'context_key' => 'called_'.$queue->window_id]
            );

            // 2. Check nearing tickets behind it
            $this->smsService->checkAndNotifyNearingQueues(
                $queue->service_id,
                $queue->queue_date ? $queue->queue_date->format('Y-m-d') : null
            );
        } catch (Exception $e) {
            Log::warning('[QueueSmsNotificationListener] Error handling QueueCalled: '.$e->getMessage());
        }
    }

    /**
     * Handle QueueTransferred event.
     */
    public function handleQueueTransferred(QueueTransferred $event): void
    {
        try {
            $queue = $event->queue;
            $this->smsService->dispatchQueueNotification(
                $queue,
                'transferred',
                ['context_key' => 'transferred_'.$queue->department_id.'_'.$queue->service_id]
            );
        } catch (Exception $e) {
            Log::warning('[QueueSmsNotificationListener] Error handling QueueTransferred: '.$e->getMessage());
        }
    }

    /**
     * Handle QueueCompleted event.
     */
    public function handleQueueCompleted(QueueCompleted $event): void
    {
        try {
            $queue = $event->queue;
            $this->smsService->dispatchQueueNotification(
                $queue,
                'completed',
                ['context_key' => 'completed']
            );

            $this->smsService->checkAndNotifyNearingQueues(
                $queue->service_id,
                $queue->queue_date ? $queue->queue_date->format('Y-m-d') : null
            );
        } catch (Exception $e) {
            Log::warning('[QueueSmsNotificationListener] Error handling QueueCompleted: '.$e->getMessage());
        }
    }

    /**
     * Handle QueueCreated event.
     */
    public function handleQueueCreated(QueueCreated $event): void
    {
        try {
            $queue = $event->queue;
            $this->smsService->checkAndNotifyNearingQueues(
                $queue->service_id,
                $queue->queue_date ? $queue->queue_date->format('Y-m-d') : null
            );
        } catch (Exception $e) {
            Log::warning('[QueueSmsNotificationListener] Error handling QueueCreated: '.$e->getMessage());
        }
    }

    /**
     * Register the listeners for the subscriber.
     *
     * @return array<string, string>
     */
    public function subscribe(): array
    {
        return [
            QueueCalled::class => 'handleQueueCalled',
            QueueTransferred::class => 'handleQueueTransferred',
            QueueCompleted::class => 'handleQueueCompleted',
            QueueCreated::class => 'handleQueueCreated',
        ];
    }
}

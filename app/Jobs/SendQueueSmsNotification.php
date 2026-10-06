<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Models\QueueSetting;
use App\Services\Notification\SmsNotificationService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendQueueSmsNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of attempts allowed.
     */
    public int $tries = 3;

    /**
     * Exponential backoff in seconds.
     *
     * @var array<int, int>
     */
    public array $backoff = [10, 60, 300];

    public function __construct(public int $notificationLogId) {}

    /**
     * Execute the job.
     */
    public function handle(SmsNotificationService $smsService): void
    {
        $log = NotificationLog::find($this->notificationLogId);
        if (! $log) {
            return;
        }

        if ($log->status === 'sent' || $log->status === 'cancelled') {
            return;
        }

        $settings = QueueSetting::getSettings();
        if (! $settings->enable_sms && $log->notification_type !== 'test_sms') {
            $log->update([
                'status' => 'cancelled',
                'error_message' => 'SMS notifications are disabled globally in hospital settings.',
            ]);

            return;
        }

        $log->increment('attempts');

        try {
            $provider = $smsService->getProvider($settings);
            $recipient = $log->raw_recipient ?: $log->recipient;

            $result = $provider->send($recipient, $log->message_body, [
                'sender_id' => $settings->sms_sender_id,
                'api_key' => $settings->sms_api_key,
                'api_secret' => $settings->sms_api_secret,
                'notification_id' => $log->id,
            ]);

            if ($result->success) {
                $log->update([
                    'status' => 'sent',
                    'provider' => $provider->name(),
                    'provider_message_id' => $result->messageId,
                    'sent_at' => now(),
                    'metadata' => array_merge((array) $log->metadata, $result->rawResponse),
                ]);
            } else {
                $isLastAttempt = $this->attempts() >= $this->tries;
                $log->update([
                    'status' => $isLastAttempt ? 'failed' : 'pending',
                    'error_message' => $result->errorMessage,
                    'failed_at' => $isLastAttempt ? now() : null,
                    'metadata' => array_merge((array) $log->metadata, $result->rawResponse),
                ]);

                if (! $isLastAttempt) {
                    $this->release($this->backoff[$this->attempts() - 1] ?? 60);
                }
            }
        } catch (Exception $e) {
            Log::error("[MedQueue SMS Job Error] Notification ID: {$log->id} - ".$e->getMessage());

            $isLastAttempt = $this->attempts() >= $this->tries;
            $log->update([
                'status' => $isLastAttempt ? 'failed' : 'pending',
                'error_message' => $e->getMessage(),
                'failed_at' => $isLastAttempt ? now() : null,
            ]);

            if (! $isLastAttempt) {
                $this->release($this->backoff[$this->attempts() - 1] ?? 60);
            }
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(?Exception $exception): void
    {
        $log = NotificationLog::find($this->notificationLogId);
        if ($log) {
            $log->update([
                'status' => 'failed',
                'error_message' => $exception?->getMessage() ?? 'Maximum attempts reached.',
                'failed_at' => now(),
            ]);
        }
    }
}

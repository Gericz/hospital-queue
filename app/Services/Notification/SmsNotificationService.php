<?php

namespace App\Services\Notification;

use App\Contracts\SmsProviderInterface;
use App\DTOs\SmsResult;
use App\Enums\QueueStatus;
use App\Jobs\SendQueueSmsNotification;
use App\Models\NotificationLog;
use App\Models\Queue;
use App\Models\QueueSetting;
use App\Services\Notification\Providers\GenericHttpSmsProvider;
use App\Services\Notification\Providers\LogSmsProvider;
use App\Services\Notification\Providers\SemaphoreSmsProvider;
use App\Services\Notification\Providers\TwilioSmsProvider;
use App\Services\Notification\Providers\VonageSmsProvider;
use Exception;

class SmsNotificationService
{
    /**
     * Normalize and validate a phone number.
     * Supports Philippine formats (09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX) and standard international numbers.
     *
     * @return array{valid: bool, normalized: ?string, masked: ?string, error: ?string}
     */
    public function validateAndNormalizePhone(?string $phone): array
    {
        if (empty($phone)) {
            return [
                'valid' => false,
                'normalized' => null,
                'masked' => null,
                'error' => 'Phone number is required.',
            ];
        }

        $clean = preg_replace('/[^\d+]/', '', trim($phone));

        // Philippine mobile number handling
        if (preg_match('/^(09|\+639|639)(\d{9})$/', $clean, $matches)) {
            $normalized = '+639'.$matches[2];
            $masked = '09'.substr($matches[2], 0, 2).'*****'.substr($matches[2], -3);

            return [
                'valid' => true,
                'normalized' => $normalized,
                'masked' => $masked,
                'error' => null,
            ];
        }

        // Generic international format (+XXXXXXXXXXX)
        if (preg_match('/^\+[1-9]\d{7,14}$/', $clean)) {
            $len = strlen($clean);
            $masked = substr($clean, 0, 4).str_repeat('*', max(2, $len - 7)).substr($clean, -3);

            return [
                'valid' => true,
                'normalized' => $clean,
                'masked' => $masked,
                'error' => null,
            ];
        }

        return [
            'valid' => false,
            'normalized' => null,
            'masked' => null,
            'error' => 'Invalid phone number format. Please enter a valid 11-digit mobile number (e.g. 09171234567).',
        ];
    }

    /**
     * Resolve the active SMS provider instance based on settings and environment.
     */
    public function getProvider(?QueueSetting $settings = null): SmsProviderInterface
    {
        $settings = $settings ?: QueueSetting::getSettings();
        $providerName = strtolower($settings->sms_provider ?: 'log');

        return match ($providerName) {
            'semaphore' => new SemaphoreSmsProvider($settings->sms_api_key, $settings->sms_sender_id),
            'twilio' => new TwilioSmsProvider($settings->sms_api_key, $settings->sms_api_secret, $settings->sms_sender_id),
            'vonage' => new VonageSmsProvider($settings->sms_api_key, $settings->sms_api_secret, $settings->sms_sender_id),
            'gateway' => new GenericHttpSmsProvider(config('services.sms_gateway.endpoint'), $settings->sms_api_key),
            default => new LogSmsProvider,
        };
    }

    /**
     * Render template placeholders safely.
     */
    public function renderTemplate(string $template, array $data): string
    {
        $replacements = [
            '{queue_number}' => $data['queue_number'] ?? '',
            '{display_number}' => $data['display_number'] ?? ($data['queue_number'] ?? ''),
            '{service}' => $data['service'] ?? '',
            '{department}' => $data['department'] ?? '',
            '{window}' => $data['window'] ?? 'Counter',
            '{hospital_name}' => $data['hospital_name'] ?? config('app.name', 'MedQueue'),
            '{status}' => $data['status'] ?? '',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Dispatch an asynchronous queue SMS notification.
     * Prevents duplicate sending using idempotency keys.
     */
    public function dispatchQueueNotification(
        Queue $queue,
        string $type,
        array $extraData = [],
        ?string $customIdempotencyKey = null
    ): ?NotificationLog {
        $settings = QueueSetting::getSettings();

        // Check if SMS is enabled globally and for this patient ticket
        if (! $settings->enable_sms || ! $queue->sms_consent || empty($queue->phone_number)) {
            return null;
        }

        $idempotencyKey = $customIdempotencyKey ?: sprintf(
            'queue_%d_%s_%s',
            $queue->id,
            $type,
            $extraData['context_key'] ?? $queue->status->value
        );

        // Check if already created or sent
        $existing = NotificationLog::where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            return $existing;
        }

        // Build message from template
        $template = $settings->getTemplate($type);
        $messageBody = $this->renderTemplate($template, [
            'queue_number' => $queue->queue_number,
            'display_number' => $queue->display_number,
            'service' => $queue->service?->name ?? 'Hospital Service',
            'department' => $queue->department?->name ?? 'Hospital Department',
            'window' => $extraData['window_name'] ?? ($queue->window?->name ?? 'Assigned Counter'),
            'hospital_name' => $settings->hospital_name,
            'status' => $queue->status->label(),
        ]);

        $phoneInfo = $this->validateAndNormalizePhone($queue->phone_number);
        $recipient = $phoneInfo['masked'] ?? NotificationLog::maskPhoneNumber($queue->phone_number);
        $rawRecipient = $phoneInfo['normalized'] ?? $queue->phone_number;

        $log = NotificationLog::create([
            'queue_id' => $queue->id,
            'channel' => 'sms',
            'notification_type' => $type,
            'recipient' => $recipient,
            'raw_recipient' => $rawRecipient,
            'status' => 'pending',
            'provider' => $settings->sms_provider ?: 'log',
            'message_body' => $messageBody,
            'idempotency_key' => $idempotencyKey,
            'attempts' => 0,
            'metadata' => array_merge($extraData, [
                'phone_valid' => $phoneInfo['valid'],
            ]),
        ]);

        // Dispatch async job
        SendQueueSmsNotification::dispatch($log->id);

        return $log;
    }

    /**
     * Send test SMS for administrators.
     */
    public function sendTestSms(string $phone, ?string $message = null): SmsResult
    {
        $settings = QueueSetting::getSettings();
        $provider = $this->getProvider($settings);

        $phoneInfo = $this->validateAndNormalizePhone($phone);
        if (! $phoneInfo['valid']) {
            return SmsResult::failure($phoneInfo['error'] ?? 'Invalid phone number');
        }

        $body = $message ?: 'MedQueue SMS Test: Gateway connection verified successfully at '.now()->format('g:i A').". - {$settings->hospital_name}";

        $log = NotificationLog::create([
            'queue_id' => null,
            'channel' => 'sms',
            'notification_type' => 'test_sms',
            'recipient' => $phoneInfo['masked'],
            'raw_recipient' => $phoneInfo['normalized'],
            'status' => 'pending',
            'provider' => $provider->name(),
            'message_body' => $body,
            'idempotency_key' => 'test_sms_'.time().'_'.bin2hex(random_bytes(4)),
            'attempts' => 1,
        ]);

        try {
            $result = $provider->send($phoneInfo['normalized'], $body, [
                'sender_id' => $settings->sms_sender_id,
                'api_key' => $settings->sms_api_key,
                'api_secret' => $settings->sms_api_secret,
            ]);

            if ($result->success) {
                $log->update([
                    'status' => 'sent',
                    'provider_message_id' => $result->messageId,
                    'sent_at' => now(),
                    'metadata' => $result->rawResponse,
                ]);
            } else {
                $log->update([
                    'status' => 'failed',
                    'error_message' => $result->errorMessage,
                    'failed_at' => now(),
                    'metadata' => $result->rawResponse,
                ]);
            }

            return $result;
        } catch (Exception $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'failed_at' => now(),
            ]);

            return SmsResult::failure($e->getMessage());
        }
    }

    /**
     * Trigger nearing notifications for patients in a department/service when queues advance.
     */
    public function checkAndNotifyNearingQueues(int $serviceId, ?string $date = null): void
    {
        $settings = QueueSetting::getSettings();
        if (! $settings->enable_sms) {
            return;
        }

        $threshold = $settings->sms_nearing_threshold ?? 3;
        $queueDate = $date ?? now()->format('Y-m-d');

        // Find waiting tickets with SMS consent
        $waitingTickets = Queue::where('service_id', $serviceId)
            ->whereDate('queue_date', $queueDate)
            ->where('status', QueueStatus::Waiting)
            ->where('sms_consent', true)
            ->orderBy('priority_level', 'asc')
            ->orderBy('queue_sequence', 'asc')
            ->take(10)
            ->get();

        foreach ($waitingTickets as $index => $ticket) {
            $peopleAhead = $index; // approximate position based on order
            if ($peopleAhead <= $threshold) {
                $this->dispatchQueueNotification(
                    $ticket,
                    'nearing',
                    ['people_ahead' => $peopleAhead, 'context_key' => 'nearing_'.$threshold]
                );
            }
        }
    }
}

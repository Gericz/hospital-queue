<?php

namespace App\Services\Notification\Providers;

use App\Contracts\SmsProviderInterface;
use App\DTOs\SmsResult;
use Exception;
use Illuminate\Support\Facades\Http;

class SemaphoreSmsProvider implements SmsProviderInterface
{
    public function __construct(
        protected ?string $apiKey = null,
        protected ?string $senderName = null
    ) {
        $this->apiKey = $apiKey ?: config('services.semaphore.api_key');
        $this->senderName = $senderName ?: config('services.semaphore.sender_name', 'MedQueue');
    }

    public function send(string $to, string $message, array $options = []): SmsResult
    {
        $apiKey = $options['api_key'] ?? $this->apiKey;
        $senderName = $options['sender_id'] ?? $this->senderName;

        if (empty($apiKey)) {
            return SmsResult::failure('Semaphore API key is not configured.');
        }

        try {
            $payload = [
                'apikey' => $apiKey,
                'number' => $to,
                'message' => $message,
            ];

            if (! empty($senderName)) {
                $payload['sendername'] = $senderName;
            }

            $response = Http::timeout(10)
                ->asForm()
                ->post('https://api.semaphore.co/api/v4/messages', $payload);

            if ($response->successful()) {
                $data = $response->json();
                $first = is_array($data) && isset($data[0]) ? $data[0] : $data;
                $messageId = $first['message_id'] ?? (string) ($first['id'] ?? 'SEMA-'.time());

                return SmsResult::success((string) $messageId, (array) $data);
            }

            return SmsResult::failure(
                'Semaphore HTTP '.$response->status().': '.$response->body(),
                ['status' => $response->status(), 'body' => $response->body()]
            );
        } catch (Exception $e) {
            return SmsResult::failure('Semaphore connection exception: '.$e->getMessage());
        }
    }

    public function name(): string
    {
        return 'semaphore';
    }
}

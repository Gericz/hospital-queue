<?php

namespace App\Services\Notification\Providers;

use App\Contracts\SmsProviderInterface;
use App\DTOs\SmsResult;
use Exception;
use Illuminate\Support\Facades\Http;

class VonageSmsProvider implements SmsProviderInterface
{
    public function __construct(
        protected ?string $apiKey = null,
        protected ?string $apiSecret = null,
        protected ?string $from = null
    ) {
        $this->apiKey = $apiKey ?: config('services.vonage.key');
        $this->apiSecret = $apiSecret ?: config('services.vonage.secret');
        $this->from = $from ?: config('services.vonage.from', 'MedQueue');
    }

    public function send(string $to, string $message, array $options = []): SmsResult
    {
        $key = $options['api_key'] ?? $this->apiKey;
        $secret = $options['api_secret'] ?? $this->apiSecret;
        $from = $options['sender_id'] ?? $this->from;

        if (empty($key) || empty($secret)) {
            return SmsResult::failure('Vonage API Key or Secret is not configured.');
        }

        try {
            $response = Http::timeout(10)->post('https://rest.nexmo.com/sms/json', [
                'api_key' => $key,
                'api_secret' => $secret,
                'to' => preg_replace('/[^0-9]/', '', $to),
                'from' => $from,
                'text' => $message,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $messages = $data['messages'] ?? [];
                if (! empty($messages) && ($messages[0]['status'] ?? '1') === '0') {
                    $messageId = $messages[0]['message-id'] ?? 'VON-'.time();

                    return SmsResult::success($messageId, (array) $data);
                }

                $errMsg = $messages[0]['error-text'] ?? 'Vonage delivery error';

                return SmsResult::failure($errMsg, (array) $data);
            }

            return SmsResult::failure('Vonage HTTP '.$response->status().': '.$response->body());
        } catch (Exception $e) {
            return SmsResult::failure('Vonage connection exception: '.$e->getMessage());
        }
    }

    public function name(): string
    {
        return 'vonage';
    }
}

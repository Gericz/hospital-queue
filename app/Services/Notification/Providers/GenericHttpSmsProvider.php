<?php

namespace App\Services\Notification\Providers;

use App\Contracts\SmsProviderInterface;
use App\DTOs\SmsResult;
use Exception;
use Illuminate\Support\Facades\Http;

class GenericHttpSmsProvider implements SmsProviderInterface
{
    public function __construct(
        protected ?string $endpoint = null,
        protected ?string $token = null
    ) {
        $this->endpoint = $endpoint ?: config('services.sms_gateway.endpoint');
        $this->token = $token ?: config('services.sms_gateway.token');
    }

    public function send(string $to, string $message, array $options = []): SmsResult
    {
        $url = $options['endpoint'] ?? $this->endpoint;
        $token = $options['api_key'] ?? $this->token;

        if (empty($url)) {
            return SmsResult::failure('Generic HTTP SMS gateway endpoint is not configured.');
        }

        try {
            $req = Http::timeout(10);
            if (! empty($token)) {
                $req = $req->withToken($token);
            }

            $response = $req->post($url, [
                'recipient' => $to,
                'message' => $message,
                'sender_id' => $options['sender_id'] ?? 'MedQueue',
            ]);

            if ($response->successful()) {
                $data = $response->json() ?? ['status' => 'ok'];
                $messageId = $data['id'] ?? $data['message_id'] ?? 'GATEWAY-'.time();

                return SmsResult::success((string) $messageId, (array) $data);
            }

            return SmsResult::failure(
                'Gateway HTTP '.$response->status().': '.$response->body(),
                ['status' => $response->status(), 'body' => $response->body()]
            );
        } catch (Exception $e) {
            return SmsResult::failure('Gateway connection exception: '.$e->getMessage());
        }
    }

    public function name(): string
    {
        return 'gateway';
    }
}

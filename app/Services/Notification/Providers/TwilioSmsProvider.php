<?php

namespace App\Services\Notification\Providers;

use App\Contracts\SmsProviderInterface;
use App\DTOs\SmsResult;
use Exception;
use Illuminate\Support\Facades\Http;

class TwilioSmsProvider implements SmsProviderInterface
{
    public function __construct(
        protected ?string $accountSid = null,
        protected ?string $authToken = null,
        protected ?string $fromNumber = null
    ) {
        $this->accountSid = $accountSid ?: config('services.twilio.sid');
        $this->authToken = $authToken ?: config('services.twilio.token');
        $this->fromNumber = $fromNumber ?: config('services.twilio.from');
    }

    public function send(string $to, string $message, array $options = []): SmsResult
    {
        $sid = $options['api_key'] ?? $this->accountSid;
        $token = $options['api_secret'] ?? $this->authToken;
        $from = $options['sender_id'] ?? $this->fromNumber;

        if (empty($sid) || empty($token)) {
            return SmsResult::failure('Twilio Account SID or Auth Token is not configured.');
        }

        try {
            $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";

            $response = Http::timeout(10)
                ->withBasicAuth($sid, $token)
                ->asForm()
                ->post($url, [
                    'To' => $to,
                    'From' => $from,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $messageId = $data['sid'] ?? 'TW-'.time();

                return SmsResult::success($messageId, (array) $data);
            }

            return SmsResult::failure(
                'Twilio HTTP '.$response->status().': '.$response->body(),
                ['status' => $response->status(), 'body' => $response->body()]
            );
        } catch (Exception $e) {
            return SmsResult::failure('Twilio connection exception: '.$e->getMessage());
        }
    }

    public function name(): string
    {
        return 'twilio';
    }
}

<?php

namespace App\Services\Notification\Providers;

use App\Contracts\SmsProviderInterface;
use App\DTOs\SmsResult;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LogSmsProvider implements SmsProviderInterface
{
    public function send(string $to, string $message, array $options = []): SmsResult
    {
        $messageId = 'LOG-SMS-'.Str::upper(Str::random(12));

        Log::info("[MedQueue SMS Simulation] To: {$to} | Msg: {$message} | MessageId: {$messageId}", [
            'provider' => 'log',
            'options' => $options,
        ]);

        return SmsResult::success($messageId, [
            'status' => 'logged',
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function name(): string
    {
        return 'log';
    }
}

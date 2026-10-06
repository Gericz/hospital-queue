<?php

namespace App\Contracts;

use App\DTOs\SmsResult;

interface SmsProviderInterface
{
    /**
     * Send an SMS message to a normalized recipient number.
     *
     * @param  string  $to  E.g. '+639171234567' or '09171234567'
     * @param  string  $message  Text message content
     * @param  array<string, mixed>  $options  Sender ID, metadata, etc.
     */
    public function send(string $to, string $message, array $options = []): SmsResult;

    /**
     * Get the unique provider identifier name.
     */
    public function name(): string;
}

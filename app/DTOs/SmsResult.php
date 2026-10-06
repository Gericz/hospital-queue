<?php

namespace App\DTOs;

class SmsResult
{
    public function __construct(
        public bool $success,
        public ?string $messageId = null,
        public ?string $errorMessage = null,
        public array $rawResponse = []
    ) {}

    public static function success(?string $messageId = null, array $raw = []): self
    {
        return new self(
            success: true,
            messageId: $messageId,
            errorMessage: null,
            rawResponse: $raw
        );
    }

    public static function failure(string $errorMessage, array $raw = []): self
    {
        return new self(
            success: false,
            messageId: null,
            errorMessage: $errorMessage,
            rawResponse: $raw
        );
    }
}

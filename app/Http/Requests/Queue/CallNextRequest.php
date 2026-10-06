<?php

namespace App\Http\Requests\Queue;

use Illuminate\Foundation\Http\FormRequest;

class CallNextRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'window_id' => ['required', 'integer', 'exists:windows,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
        ];
    }
}

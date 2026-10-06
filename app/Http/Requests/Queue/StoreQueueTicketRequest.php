<?php

namespace App\Http\Requests\Queue;

use App\Enums\PriorityType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StoreQueueTicketRequest extends FormRequest
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
            'department_id' => [
                'required',
                'integer',
                Rule::exists('departments', 'id')->where('is_active', true),
            ],
            'service_id' => [
                'required',
                'integer',
                Rule::exists('services', 'id')->where(function ($query) {
                    $query->where('is_active', true);
                    if ($this->department_id) {
                        $query->where('department_id', $this->department_id);
                    }
                }),
            ],
            'priority_type' => ['nullable', new Enum(PriorityType::class)],
            'patient_name' => ['nullable', 'string', 'max:150'],
            'patient_reference' => ['nullable', 'string', 'max:100'],
            'phone_number' => ['nullable', 'string', 'max:30', 'regex:/^(\+?[0-9\s\-\(\)]+)?$/'],
            'sms_consent' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}

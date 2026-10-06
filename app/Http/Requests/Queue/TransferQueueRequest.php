<?php

namespace App\Http\Requests\Queue;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransferQueueRequest extends FormRequest
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
            'target_department_id' => ['required', 'integer', 'exists:departments,id'],
            'target_service_id' => [
                'required',
                'integer',
                Rule::exists('services', 'id')->where(function ($query) {
                    $query->where('is_active', true);
                    if ($this->target_department_id) {
                        $query->where('department_id', $this->target_department_id);
                    }
                }),
            ],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}

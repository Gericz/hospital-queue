<?php

namespace App\Http\Requests;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Models\Service;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AnalyticsFilterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && $this->user()->is_active;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('priority_type') && is_string($this->priority_type)) {
            $this->merge([
                'priority_type' => strtoupper($this->priority_type),
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'preset' => ['nullable', 'string', Rule::in(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'custom'])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'window_id' => ['nullable', 'integer', 'exists:windows,id'],
            'priority_type' => ['nullable', 'string', Rule::in(array_map(fn ($p) => $p->value, PriorityType::cases()))],
            'status' => ['nullable', 'string', Rule::in(array_map(fn ($s) => $s->value, QueueStatus::cases()))],
            'group_by' => ['nullable', 'string', Rule::in(['day', 'week', 'month', 'hour'])],
            'report_type' => ['nullable', 'string', Rule::in(['summary', 'department_performance', 'service_performance', 'window_performance', 'waiting_time', 'priority_analysis', 'sla_compliance', 'transfers'])],
            'format' => ['nullable', 'string', Rule::in(['csv', 'pdf', 'json'])],
        ];
    }

    /**
     * Additional validation logic.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('department_id') && $this->filled('service_id')) {
                $service = Service::find($this->input('service_id'));
                if ($service && (int) $service->department_id !== (int) $this->input('department_id')) {
                    $validator->errors()->add('service_id', 'The selected service does not belong to the selected department.');
                }
            }
        });
    }
}

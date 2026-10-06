<?php

namespace App\Http\Requests\Window;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWindowRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->canManageMasterData() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $windowId = $this->route('window')?->id ?? $this->route('window');
        $departmentId = $this->input('department_id') ?? $this->route('window')?->department_id;

        return [
            'department_id' => ['sometimes', 'required', 'integer', 'exists:departments,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'window_number' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                Rule::unique('windows', 'window_number')
                    ->where(fn ($q) => $q->where('department_id', $departmentId))
                    ->ignore($windowId),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'display_name' => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Custom attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'department_id' => 'department',
            'service_id' => 'clinical service',
            'window_number' => 'window number',
            'name' => 'window name',
            'display_name' => 'display name',
            'is_active' => 'active status',
        ];
    }
}

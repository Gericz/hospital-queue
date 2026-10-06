<?php

namespace App\Http\Requests\Window;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWindowRequest extends FormRequest
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
        return [
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'window_number' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('windows', 'window_number')->where(function ($query) {
                    return $query->where('department_id', $this->department_id);
                }),
            ],
            'name' => ['required', 'string', 'max:100'],
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

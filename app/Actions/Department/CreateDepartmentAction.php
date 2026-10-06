<?php

namespace App\Actions\Department;

use App\Models\Department;

class CreateDepartmentAction
{
    /**
     * @param  array{code: string, name: string, description?: ?string, is_active?: bool}  $data
     */
    public function execute(array $data): Department
    {
        return Department::create([
            'code' => strtoupper(trim($data['code'])),
            'name' => trim($data['name']),
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }
}

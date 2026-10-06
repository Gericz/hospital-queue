<?php

namespace App\Actions\Department;

use App\Models\Department;

class UpdateDepartmentAction
{
    /**
     * @param  array{code?: string, name?: string, description?: ?string, is_active?: bool}  $data
     */
    public function execute(Department $department, array $data): Department
    {
        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
        }
        if (isset($data['name'])) {
            $data['name'] = trim($data['name']);
        }

        $department->update($data);

        return $department->fresh();
    }
}

<?php

namespace App\Actions\Department;

use App\Models\Department;

class ToggleDepartmentStatusAction
{
    public function execute(Department $department): Department
    {
        $department->update([
            'is_active' => ! $department->is_active,
        ]);

        return $department->fresh();
    }
}

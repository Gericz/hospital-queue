<?php

namespace App\Actions\Department;

use App\Models\Department;
use Illuminate\Validation\ValidationException;

class DeleteDepartmentAction
{
    public function execute(Department $department): bool
    {
        if ($department->services()->exists() || $department->windows()->exists()) {
            throw ValidationException::withMessages([
                'department' => 'Cannot delete department with existing services or windows. Please remove or reassign them first.',
            ]);
        }

        return (bool) $department->delete();
    }
}

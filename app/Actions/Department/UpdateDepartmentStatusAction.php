<?php

namespace App\Actions\Department;

use App\Enums\DepartmentStatus;
use App\Events\Department\DepartmentStatusChanged;
use App\Models\Department;
use App\Models\User;

class UpdateDepartmentStatusAction
{
    public function execute(Department $department, DepartmentStatus $status, ?string $reason = null, ?User $actor = null): Department
    {
        $department->status = $status;
        $department->status_reason = $reason;
        $department->save();

        event(new DepartmentStatusChanged($department));

        return $department;
    }
}

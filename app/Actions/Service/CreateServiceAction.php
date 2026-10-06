<?php

namespace App\Actions\Service;

use App\Models\Service;

class CreateServiceAction
{
    /**
     * @param  array{department_id: int, code: string, name: string, description?: ?string, prefix: string, is_active?: bool}  $data
     */
    public function execute(array $data): Service
    {
        return Service::create([
            'department_id' => $data['department_id'],
            'code' => strtoupper($data['code']),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'prefix' => strtoupper($data['prefix']),
            'is_active' => $data['is_active'] ?? true,
        ]);
    }
}

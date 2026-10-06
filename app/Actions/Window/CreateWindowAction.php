<?php

namespace App\Actions\Window;

use App\Models\Window;

class CreateWindowAction
{
    /**
     * @param  array{department_id: int, window_number: string, name: string, is_active?: bool}  $data
     */
    public function execute(array $data): Window
    {
        return Window::create([
            'department_id' => (int) $data['department_id'],
            'window_number' => trim($data['window_number']),
            'name' => trim($data['name']),
            'is_active' => $data['is_active'] ?? true,
        ]);
    }
}

<?php

namespace App\Actions\Window;

use App\Models\Window;

class UpdateWindowAction
{
    /**
     * @param  array{department_id?: int, window_number?: string, name?: string, is_active?: bool}  $data
     */
    public function execute(Window $window, array $data): Window
    {
        if (isset($data['department_id'])) {
            $data['department_id'] = (int) $data['department_id'];
        }
        if (isset($data['window_number'])) {
            $data['window_number'] = trim($data['window_number']);
        }
        if (isset($data['name'])) {
            $data['name'] = trim($data['name']);
        }

        $window->update($data);

        return $window->fresh();
    }
}

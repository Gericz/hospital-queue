<?php

namespace App\Actions\Window;

use App\Models\Window;

class ToggleWindowStatusAction
{
    public function execute(Window $window): Window
    {
        $window->update([
            'is_active' => ! $window->is_active,
        ]);

        return $window->fresh();
    }
}

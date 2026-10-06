<?php

namespace App\Actions\Window;

use App\Models\Window;
use Illuminate\Validation\ValidationException;

class DeleteWindowAction
{
    public function execute(Window $window): bool
    {
        if ($window->queues()->exists()) {
            throw ValidationException::withMessages([
                'window' => 'Cannot delete window that has associated queue assignments. Deactivate it instead.',
            ]);
        }

        return (bool) $window->delete();
    }
}

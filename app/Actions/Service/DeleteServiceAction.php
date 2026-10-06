<?php

namespace App\Actions\Service;

use App\Models\Service;
use Illuminate\Validation\ValidationException;

class DeleteServiceAction
{
    public function execute(Service $service): bool
    {
        if ($service->queues()->exists()) {
            throw ValidationException::withMessages([
                'service' => 'Cannot delete service that already has associated queue history. Deactivate it instead.',
            ]);
        }

        return (bool) $service->delete();
    }
}

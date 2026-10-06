<?php

namespace App\Actions\Service;

use App\Models\Service;

class ToggleServiceStatusAction
{
    public function execute(Service $service): Service
    {
        $service->update([
            'is_active' => ! $service->is_active,
        ]);

        return $service->fresh();
    }
}

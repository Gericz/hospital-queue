<?php

namespace App\Actions\Window;

use App\Enums\WindowStatus;
use App\Events\Window\WindowStatusChanged;
use App\Models\User;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class OpenWindowAction
{
    public function execute(Window $window, ?User $actor = null, ?int $serviceId = null): Window
    {
        if (! $window->is_active) {
            throw ValidationException::withMessages([
                'window' => 'Cannot open an inactive window.',
            ]);
        }

        if ($window->department && ! $window->department->is_active) {
            throw ValidationException::withMessages([
                'window' => 'Cannot open a window in an inactive department.',
            ]);
        }

        if ($serviceId !== null) {
            $window->service_id = $serviceId;
        }

        $window->status = WindowStatus::Open;
        $window->last_activity_at = Carbon::now();
        $window->save();

        $window->load(['department', 'service', 'activeAssignment.user']);

        event(new WindowStatusChanged($window, 'open'));

        return $window;
    }
}

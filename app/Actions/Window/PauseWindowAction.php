<?php

namespace App\Actions\Window;

use App\Enums\WindowStatus;
use App\Events\Window\WindowStatusChanged;
use App\Models\User;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class PauseWindowAction
{
    public function execute(Window $window, ?User $actor = null): Window
    {
        if ($window->status !== WindowStatus::Open) {
            throw ValidationException::withMessages([
                'window' => 'Only currently open windows can be paused.',
            ]);
        }

        $window->status = WindowStatus::Paused;
        $window->last_activity_at = Carbon::now();
        $window->save();

        $window->load(['department', 'service', 'activeAssignment.user']);

        event(new WindowStatusChanged($window, 'pause'));

        return $window;
    }
}

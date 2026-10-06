<?php

namespace App\Actions\Window;

use App\Enums\WindowStatus;
use App\Events\Window\WindowStatusChanged;
use App\Models\User;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class ResumeWindowAction
{
    public function execute(Window $window, ?User $actor = null): Window
    {
        if ($window->status !== WindowStatus::Paused) {
            throw ValidationException::withMessages([
                'window' => 'Only paused windows can be resumed.',
            ]);
        }

        $window->status = WindowStatus::Open;
        $window->last_activity_at = Carbon::now();
        $window->save();

        $window->load(['department', 'service', 'activeAssignment.user']);

        event(new WindowStatusChanged($window, 'resume'));

        return $window;
    }
}

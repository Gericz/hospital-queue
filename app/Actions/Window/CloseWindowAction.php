<?php

namespace App\Actions\Window;

use App\Enums\WindowStatus;
use App\Events\Window\WindowStatusChanged;
use App\Models\User;
use App\Models\Window;
use Carbon\Carbon;

class CloseWindowAction
{
    public function execute(Window $window, ?User $actor = null): Window
    {
        $window->status = WindowStatus::Closed;
        $window->last_activity_at = Carbon::now();
        $window->save();

        $window->load(['department', 'service', 'activeAssignment.user']);

        event(new WindowStatusChanged($window, 'close'));

        return $window;
    }
}

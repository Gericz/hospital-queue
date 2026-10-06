<?php

namespace App\Actions\Window;

use App\Enums\WindowAssignmentStatus;
use App\Enums\WindowStatus;
use App\Events\Window\WindowStaffUnassigned;
use App\Events\Window\WindowStatusChanged;
use App\Models\User;
use App\Models\Window;
use App\Models\WindowAssignment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class UnassignStaffAction
{
    public function execute(Window $window, ?User $actor = null, bool $closeWindow = true): ?WindowAssignment
    {
        return DB::transaction(function () use ($window, $closeWindow) {
            $now = Carbon::now();

            $activeAssignment = WindowAssignment::where('window_id', $window->id)
                ->where('status', WindowAssignmentStatus::Active)
                ->lockForUpdate()
                ->first();

            if (! $activeAssignment) {
                if ($closeWindow) {
                    $window->status = WindowStatus::Closed;
                    $window->last_activity_at = $now;
                    $window->save();
                    event(new WindowStatusChanged($window, 'close'));
                }

                return null;
            }

            $staff = $activeAssignment->user;

            $activeAssignment->update([
                'status' => WindowAssignmentStatus::Ended,
                'ended_at' => $now,
            ]);

            if ($closeWindow) {
                $window->status = WindowStatus::Closed;
            }

            $window->last_activity_at = $now;
            $window->save();

            $window->load(['department', 'service']);

            if ($staff) {
                event(new WindowStaffUnassigned($window, $staff, $activeAssignment));
            }
            event(new WindowStatusChanged($window, 'staff_unassigned'));

            return $activeAssignment;
        });
    }
}

<?php

namespace App\Actions\Window;

use App\Enums\WindowAssignmentStatus;
use App\Enums\WindowStatus;
use App\Events\Window\WindowStaffAssigned;
use App\Events\Window\WindowStatusChanged;
use App\Models\User;
use App\Models\Window;
use App\Models\WindowAssignment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignStaffAction
{
    public function execute(Window $window, User $staff, ?User $actor = null, bool $openWindow = true): WindowAssignment
    {
        if (! $window->is_active) {
            throw ValidationException::withMessages([
                'window_id' => 'Cannot assign staff to an inactive window counter.',
            ]);
        }

        if (! $staff->is_active) {
            throw ValidationException::withMessages([
                'user_id' => 'The selected staff member is inactive.',
            ]);
        }

        if (! $staff->role->isWindowStaff()) {
            throw ValidationException::withMessages([
                'user_id' => 'The selected user does not have permission to operate window counters.',
            ]);
        }

        return DB::transaction(function () use ($window, $staff, $actor, $openWindow) {
            $now = Carbon::now();

            // End any prior active assignment for this specific user
            WindowAssignment::where('user_id', $staff->id)
                ->where('status', WindowAssignmentStatus::Active)
                ->lockForUpdate()
                ->update([
                    'status' => WindowAssignmentStatus::Ended,
                    'ended_at' => $now,
                ]);

            // End any prior active assignment on this window
            WindowAssignment::where('window_id', $window->id)
                ->where('status', WindowAssignmentStatus::Active)
                ->lockForUpdate()
                ->update([
                    'status' => WindowAssignmentStatus::Ended,
                    'ended_at' => $now,
                ]);

            // Create new active assignment
            $assignment = WindowAssignment::create([
                'window_id' => $window->id,
                'user_id' => $staff->id,
                'assigned_by' => $actor?->id,
                'assigned_at' => $now,
                'status' => WindowAssignmentStatus::Active,
            ]);

            // Open window if requested and was closed
            if ($openWindow && ($window->status === WindowStatus::Closed || $window->status === WindowStatus::Offline)) {
                $window->status = WindowStatus::Open;
            }

            $window->last_activity_at = $now;
            $window->save();

            $window->load(['department', 'service', 'activeAssignment.user']);

            event(new WindowStaffAssigned($window, $staff, $assignment));
            event(new WindowStatusChanged($window, 'staff_assigned'));

            return $assignment->load(['window', 'user', 'assigner']);
        });
    }
}

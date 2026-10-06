<?php

namespace App\Http\Controllers\Api;

use App\Actions\Queue\CancelQueueAction;
use App\Actions\Queue\ChangeQueuePriorityAction;
use App\Actions\Queue\TransferQueueAction;
use App\Actions\Window\AssignStaffAction;
use App\Actions\Window\CloseWindowAction;
use App\Actions\Window\OpenWindowAction;
use App\Actions\Window\PauseWindowAction;
use App\Actions\Window\ResumeWindowAction;
use App\Actions\Window\UnassignStaffAction;
use App\Enums\PriorityType;
use App\Http\Controllers\Controller;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use App\Services\OperationsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rules\Enum;

class OperationsApiController extends Controller
{
    /**
     * Get operations dashboard metrics.
     */
    public function dashboard(Request $request, OperationsService $service): JsonResponse
    {
        $date = $request->input('date', Carbon::today()->format('Y-m-d'));
        $departmentId = $request->integer('department_id') ?: null;

        $metrics = $service->getMetrics($date, $departmentId);

        return response()->json([
            'data' => $metrics,
        ]);
    }

    /**
     * Get live windows operations board.
     */
    public function windows(Request $request, OperationsService $service): JsonResponse
    {
        $departmentId = $request->integer('department_id') ?: null;
        $board = $service->getOperationsBoard($departmentId);

        return response()->json([
            'data' => $board,
        ]);
    }

    /**
     * Open window.
     */
    public function openWindow(Request $request, Window $window, OpenWindowAction $action): JsonResponse
    {
        Gate::authorize('operate', $window);

        $serviceId = $request->integer('service_id') ?: null;
        $window = $action->execute($window, $request->user(), $serviceId);

        return response()->json([
            'message' => "Window #{$window->window_number} is now OPEN.",
            'data' => [
                'id' => $window->id,
                'status' => $window->status->value,
                'is_active' => $window->is_active,
            ],
        ]);
    }

    /**
     * Close window.
     */
    public function closeWindow(Request $request, Window $window, CloseWindowAction $action): JsonResponse
    {
        Gate::authorize('operate', $window);

        $window = $action->execute($window, $request->user());

        return response()->json([
            'message' => "Window #{$window->window_number} is now CLOSED.",
            'data' => [
                'id' => $window->id,
                'status' => $window->status->value,
            ],
        ]);
    }

    /**
     * Pause window.
     */
    public function pauseWindow(Request $request, Window $window, PauseWindowAction $action): JsonResponse
    {
        Gate::authorize('operate', $window);

        $window = $action->execute($window, $request->user());

        return response()->json([
            'message' => "Window #{$window->window_number} is now PAUSED.",
            'data' => [
                'id' => $window->id,
                'status' => $window->status->value,
            ],
        ]);
    }

    /**
     * Resume window.
     */
    public function resumeWindow(Request $request, Window $window, ResumeWindowAction $action): JsonResponse
    {
        Gate::authorize('operate', $window);

        $window = $action->execute($window, $request->user());

        return response()->json([
            'message' => "Window #{$window->window_number} is now OPEN.",
            'data' => [
                'id' => $window->id,
                'status' => $window->status->value,
            ],
        ]);
    }

    /**
     * Assign staff to window.
     */
    public function assignStaff(Request $request, Window $window, AssignStaffAction $action): JsonResponse
    {
        Gate::authorize('assign', $window);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'open_window' => ['sometimes', 'boolean'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
        ]);

        $staff = User::findOrFail($validated['user_id']);

        if (! empty($validated['service_id'])) {
            $window->service_id = $validated['service_id'];
            $window->save();
        }

        $assignment = $action->execute($window, $staff, $request->user(), $validated['open_window'] ?? true);

        return response()->json([
            'message' => "Staff {$staff->name} assigned to Window #{$window->window_number}.",
            'data' => [
                'window_id' => $window->id,
                'staff_id' => $staff->id,
                'staff_name' => $staff->name,
                'assignment_id' => $assignment->id,
                'assigned_at' => $assignment->assigned_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Unassign staff from window.
     */
    public function unassignStaff(Request $request, Window $window, UnassignStaffAction $action): JsonResponse
    {
        Gate::authorize('assign', $window);

        $closeWindow = $request->boolean('close_window', true);
        $action->execute($window, $request->user(), $closeWindow);

        return response()->json([
            'message' => "Staff unassigned from Window #{$window->window_number}.",
            'data' => [
                'window_id' => $window->id,
                'status' => $window->fresh()->status->value,
            ],
        ]);
    }

    /**
     * Transfer queue ticket.
     */
    public function transferQueue(Request $request, Queue $queue, TransferQueueAction $action): JsonResponse
    {
        Gate::authorize('transfer', $queue);

        $validated = $request->validate([
            'target_department_id' => ['required', 'integer', 'exists:departments,id'],
            'target_service_id' => ['required', 'integer', 'exists:services,id'],
            'target_window_id' => ['nullable', 'integer', 'exists:windows,id'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $action->execute($queue, $request->user(), $validated);

        return response()->json([
            'message' => 'Queue transferred successfully.',
            'data' => [
                'source_queue' => [
                    'id' => $result['source_queue']->id,
                    'queue_number' => $result['source_queue']->queue_number,
                    'status' => $result['source_queue']->status->value,
                ],
                'new_queue' => [
                    'id' => $result['new_queue']->id,
                    'queue_number' => $result['new_queue']->queue_number,
                    'display_number' => $result['new_queue']->display_number,
                    'status' => $result['new_queue']->status->value,
                    'public_token' => $result['new_queue']->public_token,
                ],
            ],
        ]);
    }

    /**
     * Cancel queue ticket.
     */
    public function cancelQueue(Request $request, Queue $queue, CancelQueueAction $action): JsonResponse
    {
        Gate::authorize('cancel', $queue);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancelled = $action->execute($queue, $request->user(), $validated['reason'] ?? null);

        return response()->json([
            'message' => "Queue #{$queue->queue_number} has been cancelled.",
            'data' => [
                'id' => $cancelled->id,
                'queue_number' => $cancelled->queue_number,
                'status' => $cancelled->status->value,
            ],
        ]);
    }

    /**
     * Change queue ticket priority.
     */
    public function changePriority(Request $request, Queue $queue, ChangeQueuePriorityAction $action): JsonResponse
    {
        Gate::authorize('changePriority', $queue);

        $validated = $request->validate([
            'priority_type' => ['required', new Enum(PriorityType::class)],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $newPriority = PriorityType::from($validated['priority_type']);
        $updated = $action->execute($queue, $request->user(), $newPriority, $validated['reason'] ?? null);

        return response()->json([
            'message' => "Priority updated to {$newPriority->label()}.",
            'data' => [
                'id' => $updated->id,
                'queue_number' => $updated->queue_number,
                'priority_type' => $updated->priority_type->value,
                'priority_level' => $updated->priority_level,
            ],
        ]);
    }

    /**
     * Check service availability.
     */
    public function serviceAvailability(Service $service): JsonResponse
    {
        $today = Carbon::today()->format('Y-m-d');

        return response()->json([
            'data' => [
                'id' => $service->id,
                'code' => $service->code,
                'name' => $service->name,
                'status' => $service->status->value,
                'status_label' => $service->status->label(),
                'status_reason' => $service->status_reason,
                'is_active' => $service->is_active,
                'is_open' => $service->isWithinOperatingHours(),
                'is_full' => $service->hasReachedDailyLimit($today),
                'has_reached_waiting_limit' => $service->hasReachedWaitingLimit($today),
                'department' => [
                    'id' => $service->department?->id,
                    'name' => $service->department?->name,
                    'status' => $service->department?->status->value,
                ],
                'operating_hours' => $service->operatingHours()->orderBy('day_of_week')->get(),
            ],
        ]);
    }
}

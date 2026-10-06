<?php

namespace App\Http\Controllers\Api;

use App\Enums\QueueStatus;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Queue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class QueueDisplayController extends Controller
{
    /**
     * Get public-safe display data for a department TV screen.
     * ZERO PII (no patient name, no phone, no medical details).
     */
    public function show(?Department $department = null): JsonResponse
    {
        $today = Carbon::today()->format('Y-m-d');
        $departments = Department::where('is_active', true)
            ->orderBy('id')
            ->get();

        $selectedDepartment = ($department && $department->is_active)
            ? $department
            : null;

        // Build display data for all active departments
        $departmentsData = $departments->map(function (Department $dept) use ($today) {
            $deptWindows = $dept->windows()
                ->where('is_active', true)
                ->orderBy('window_number')
                ->get()
                ->map(fn ($w) => [
                    'id' => $w->id,
                    'window_number' => $w->window_number,
                    'name' => $w->name,
                ]);

            $deptNowServing = Queue::where('department_id', $dept->id)
                ->whereDate('queue_date', $today)
                ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
                ->with(['service', 'window'])
                ->orderBy('called_at', 'desc')
                ->get()
                ->map(fn (Queue $q) => [
                    'queue_id' => $q->id,
                    'queue_number' => $q->queue_number,
                    'display_number' => $q->display_number,
                    'service_name' => $q->service?->name,
                    'service_code' => $q->service?->code,
                    'service_prefix' => $q->service?->prefix,
                    'window_id' => $q->window_id,
                    'window_number' => $q->window?->window_number,
                    'window_name' => $q->window?->name,
                    'department_id' => $q->department_id,
                    'department_name' => $dept->name,
                    'department_code' => $dept->code,
                    'status' => $q->status->value,
                    'status_label' => $q->status->label(),
                    'priority_type' => $q->priority_type->value,
                    'priority_label' => $q->priority_type->label(),
                    'called_at' => $q->called_at?->toIso8601String(),
                    'started_at' => $q->started_at?->toIso8601String(),
                ]);

            $deptUpcomingWaiting = Queue::where('department_id', $dept->id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueStatus::Waiting->value)
                ->with(['service'])
                ->orderBy('priority_level', 'asc')
                ->orderBy('queue_sequence', 'asc')
                ->take(8)
                ->get()
                ->map(fn (Queue $q) => [
                    'queue_id' => $q->id,
                    'queue_number' => $q->queue_number,
                    'service_name' => $q->service?->name,
                    'service_prefix' => $q->service?->prefix,
                    'department_id' => $dept->id,
                    'department_name' => $dept->name,
                    'priority_type' => $q->priority_type->value,
                    'priority_label' => $q->priority_type->label(),
                ]);

            return [
                'id' => $dept->id,
                'code' => $dept->code,
                'name' => $dept->name,
                'description' => $dept->description,
                'windows' => $deptWindows,
                'now_serving' => $deptNowServing,
                'upcoming_waiting' => $deptUpcomingWaiting,
            ];
        });

        // Combined hospital-wide now serving
        $allNowServing = Queue::whereDate('queue_date', $today)
            ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
            ->with(['service', 'window', 'department'])
            ->orderBy('called_at', 'desc')
            ->get()
            ->map(fn (Queue $q) => [
                'queue_id' => $q->id,
                'queue_number' => $q->queue_number,
                'display_number' => $q->display_number,
                'service_name' => $q->service?->name,
                'service_code' => $q->service?->code,
                'service_prefix' => $q->service?->prefix,
                'window_id' => $q->window_id,
                'window_number' => $q->window?->window_number,
                'window_name' => $q->window?->name,
                'department_id' => $q->department_id,
                'department_name' => $q->department?->name,
                'department_code' => $q->department?->code,
                'status' => $q->status->value,
                'status_label' => $q->status->label(),
                'priority_type' => $q->priority_type->value,
                'priority_label' => $q->priority_type->label(),
                'called_at' => $q->called_at?->toIso8601String(),
                'started_at' => $q->started_at?->toIso8601String(),
            ]);

        // Combined hospital-wide waiting queues
        $allUpcomingWaiting = Queue::whereDate('queue_date', $today)
            ->where('status', QueueStatus::Waiting->value)
            ->with(['service', 'department'])
            ->orderBy('priority_level', 'asc')
            ->orderBy('queue_sequence', 'asc')
            ->take(16)
            ->get()
            ->map(fn (Queue $q) => [
                'queue_id' => $q->id,
                'queue_number' => $q->queue_number,
                'service_name' => $q->service?->name,
                'service_prefix' => $q->service?->prefix,
                'department_id' => $q->department_id,
                'department_name' => $q->department?->name,
                'priority_type' => $q->priority_type->value,
                'priority_label' => $q->priority_type->label(),
            ]);

        $singleDeptData = $selectedDepartment
            ? $departmentsData->firstWhere('id', $selectedDepartment->id)
            : null;

        $windows = $singleDeptData ? $singleDeptData['windows'] : [];
        $nowServing = $singleDeptData ? $singleDeptData['now_serving'] : $allNowServing;
        $upcomingWaiting = $singleDeptData ? $singleDeptData['upcoming_waiting'] : $allUpcomingWaiting;

        return response()->json([
            'department' => $selectedDepartment ? [
                'id' => $selectedDepartment->id,
                'code' => $selectedDepartment->code,
                'name' => $selectedDepartment->name,
                'description' => $selectedDepartment->description,
            ] : null,
            'is_all_departments' => $selectedDepartment === null,
            'departments_data' => $departmentsData,
            'now_serving' => $nowServing,
            'upcoming_waiting' => $upcomingWaiting,
            'all_now_serving' => $allNowServing,
            'all_upcoming_waiting' => $allUpcomingWaiting,
            'windows' => $windows,
            'server_time' => Carbon::now()->toIso8601String(),
        ]);
    }
}

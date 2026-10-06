<?php

namespace App\Http\Controllers;

use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueueDisplayController extends Controller
{
    /**
     * Display the TV Screen View for the hospital waiting lobby.
     * Publicly accessible, zero PII, designed for 1080p full-screen display.
     */
    public function show(Request $request, ?Department $department = null): Response
    {
        $departments = Department::where('is_active', true)
            ->orderBy('id')
            ->get();

        $selectedDepartment = $department && $department->is_active
            ? $department
            : null;

        $today = Carbon::today()->format('Y-m-d');

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

        // Combined hospital-wide now serving (most recent call first)
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

        // If a specific department is selected, filter single view data
        $singleDeptData = $selectedDepartment
            ? $departmentsData->firstWhere('id', $selectedDepartment->id)
            : null;

        $windows = $singleDeptData ? $singleDeptData['windows'] : [];
        $nowServing = $singleDeptData ? $singleDeptData['now_serving'] : $allNowServing;
        $upcomingWaiting = $singleDeptData ? $singleDeptData['upcoming_waiting'] : $allUpcomingWaiting;

        return Inertia::render('Queue/Display', [
            'departments' => $departments,
            'departmentsData' => $departmentsData,
            'selectedDepartment' => $selectedDepartment ? [
                'id' => $selectedDepartment->id,
                'code' => $selectedDepartment->code,
                'name' => $selectedDepartment->name,
                'description' => $selectedDepartment->description,
            ] : null,
            'isAllDepartments' => $selectedDepartment === null,
            'windows' => $windows,
            'initialNowServing' => $nowServing,
            'initialUpcomingWaiting' => $upcomingWaiting,
            'allNowServing' => $allNowServing,
            'serverTime' => Carbon::now()->toIso8601String(),
            'reverbConfig' => [
                'key' => config('reverb.apps.apps.0.key', env('VITE_REVERB_APP_KEY')),
                'host' => config('reverb.servers.reverb.hostname', env('VITE_REVERB_HOST', 'localhost')),
                'port' => (int) config('reverb.servers.reverb.port', env('VITE_REVERB_PORT', 8080)),
                'scheme' => config('reverb.servers.reverb.options.tls') ? 'https' : (env('VITE_REVERB_SCHEME', 'http')),
            ],
        ]);
    }
}

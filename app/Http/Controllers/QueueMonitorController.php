<?php

namespace App\Http\Controllers;

use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueueMonitorController extends Controller
{
    /**
     * Display the real-time Queue Monitor dashboard for hospital supervisors and administrators.
     */
    public function index(Request $request): Response
    {
        $today = Carbon::today()->format('Y-m-d');
        $departmentId = $request->input('department_id');

        $departments = Department::where('is_active', true)
            ->with([
                'services' => fn ($q) => $q->where('is_active', true)->orderBy('name'),
                'windows' => fn ($q) => $q->where('is_active', true)->orderBy('window_number'),
            ])
            ->orderBy('name')
            ->get();

        $selectedDepartment = $departmentId
            ? $departments->firstWhere('id', (int) $departmentId)
            : $departments->first();

        $activeQueues = [];
        $waitingQueues = [];
        $holdQueues = [];
        $recentCompleted = [];

        if ($selectedDepartment) {
            // Currently called or serving at windows
            $activeQueues = Queue::where('department_id', $selectedDepartment->id)
                ->whereDate('queue_date', $today)
                ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
                ->with(['service', 'window', 'caller', 'server'])
                ->get();

            // Waiting in queue
            $waitingQueues = Queue::where('department_id', $selectedDepartment->id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueStatus::Waiting->value)
                ->with(['service'])
                ->orderBy('priority_level', 'asc')
                ->orderBy('queue_sequence', 'asc')
                ->take(50)
                ->get();

            // On Hold
            $holdQueues = Queue::where('department_id', $selectedDepartment->id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueStatus::Hold->value)
                ->with(['service', 'window'])
                ->orderBy('held_at', 'desc')
                ->get();

            // Recently completed (last 10)
            $recentCompleted = Queue::where('department_id', $selectedDepartment->id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueStatus::Completed->value)
                ->with(['service', 'window'])
                ->orderBy('completed_at', 'desc')
                ->take(10)
                ->get();
        }

        return Inertia::render('Queue/Monitor', [
            'departments' => $departments,
            'selectedDepartment' => $selectedDepartment,
            'activeQueues' => $activeQueues,
            'waitingQueues' => $waitingQueues,
            'holdQueues' => $holdQueues,
            'recentCompleted' => $recentCompleted,
        ]);
    }
}

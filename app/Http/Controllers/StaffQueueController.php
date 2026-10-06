<?php

namespace App\Http\Controllers;

use App\Actions\Queue\CallNextQueueAction;
use App\Actions\Queue\CompleteQueueAction;
use App\Actions\Queue\HoldQueueAction;
use App\Actions\Queue\RecallQueueAction;
use App\Actions\Queue\ResumeQueueAction;
use App\Actions\Queue\SkipQueueAction;
use App\Actions\Queue\StartServingQueueAction;
use App\Actions\Queue\TransferQueueAction;
use App\Enums\QueueStatus;
use App\Http\Requests\Queue\CallNextRequest;
use App\Http\Requests\Queue\TransferQueueRequest;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffQueueController extends Controller
{
    /**
     * Display the staff workstation queue management terminal.
     */
    public function index(Request $request): Response
    {
        $selectedDepartmentId = $request->input('department_id');
        $selectedWindowId = $request->input('window_id');
        $today = Carbon::today()->format('Y-m-d');

        $departments = Department::where('is_active', true)
            ->with([
                'services' => fn ($q) => $q->where('is_active', true)->orderBy('name'),
                'windows' => fn ($q) => $q->where('is_active', true)->orderBy('window_number'),
            ])
            ->orderBy('name')
            ->get();

        $selectedDepartment = $selectedDepartmentId
            ? $departments->firstWhere('id', (int) $selectedDepartmentId)
            : $departments->first();

        $selectedWindow = null;
        if ($selectedDepartment && $selectedWindowId) {
            $selectedWindow = $selectedDepartment->windows->firstWhere('id', (int) $selectedWindowId);
        }

        // Active ticket currently at the selected window
        $currentTicket = null;
        if ($selectedWindow) {
            $currentTicket = Queue::where('window_id', $selectedWindow->id)
                ->whereDate('queue_date', $today)
                ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
                ->with(['service', 'department', 'caller', 'server'])
                ->first();
        }

        // Waiting queue for the selected department
        $waitingQueue = [];
        $holdQueue = [];
        $todayStats = [
            'waiting' => 0,
            'serving' => 0,
            'completed' => 0,
            'skipped' => 0,
            'hold' => 0,
        ];

        if ($selectedDepartment) {
            $waitingQueue = Queue::where('department_id', $selectedDepartment->id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueStatus::Waiting->value)
                ->with(['service'])
                ->orderBy('priority_level', 'asc')
                ->orderBy('queue_sequence', 'asc')
                ->take(50)
                ->get();

            $holdQueue = Queue::where('department_id', $selectedDepartment->id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueStatus::Hold->value)
                ->with(['service', 'window'])
                ->orderBy('held_at', 'desc')
                ->get();

            $statusCounts = Queue::where('department_id', $selectedDepartment->id)
                ->whereDate('queue_date', $today)
                ->selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->all();

            $todayStats = [
                'waiting' => $statusCounts[QueueStatus::Waiting->value] ?? 0,
                'serving' => ($statusCounts[QueueStatus::Serving->value] ?? 0) + ($statusCounts[QueueStatus::Called->value] ?? 0),
                'completed' => $statusCounts[QueueStatus::Completed->value] ?? 0,
                'skipped' => $statusCounts[QueueStatus::Skipped->value] ?? 0,
                'hold' => $statusCounts[QueueStatus::Hold->value] ?? 0,
            ];
        }

        return Inertia::render('Queue/StaffTerminal', [
            'departments' => $departments,
            'selectedDepartment' => $selectedDepartment,
            'selectedWindow' => $selectedWindow,
            'currentTicket' => $currentTicket,
            'waitingQueue' => $waitingQueue,
            'holdQueue' => $holdQueue,
            'todayStats' => $todayStats,
        ]);
    }

    public function callNext(CallNextRequest $request, CallNextQueueAction $action): RedirectResponse
    {
        $window = Window::findOrFail($request->validated('window_id'));
        $serviceId = $request->validated('service_id');

        $queue = $action->execute(
            window: $window,
            user: $request->user(),
            serviceId: $serviceId
        );

        if (! $queue) {
            return back()->with('info', 'No patients currently waiting in queue.');
        }

        return back()->with('success', "Called Ticket #{$queue->queue_number} to Window {$window->name}.");
    }

    public function recall(Queue $queue, Request $request, RecallQueueAction $action): RedirectResponse
    {
        $window = null;
        if ($request->has('window_id')) {
            $window = Window::find($request->input('window_id'));
        }

        $recalled = $action->execute($queue, $request->user(), $window);

        return back()->with('success', "Recalled Ticket #{$recalled->queue_number}.");
    }

    public function startServing(Queue $queue, Request $request, StartServingQueueAction $action): RedirectResponse
    {
        $window = null;
        if ($request->has('window_id')) {
            $window = Window::find($request->input('window_id'));
        }

        $served = $action->execute($queue, $request->user(), $window);

        return back()->with('success', "Started serving Ticket #{$served->queue_number}.");
    }

    public function complete(Queue $queue, Request $request, CompleteQueueAction $action): RedirectResponse
    {
        $window = null;
        if ($request->has('window_id')) {
            $window = Window::find($request->input('window_id'));
        }

        $completed = $action->execute($queue, $request->user(), $window);

        return back()->with('success', "Completed Ticket #{$completed->queue_number}.");
    }

    public function skip(Queue $queue, Request $request, SkipQueueAction $action): RedirectResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        $skipped = $action->execute(
            queue: $queue,
            user: $request->user(),
            window: $queue->window,
            reason: $request->input('reason')
        );

        return back()->with('info', "Skipped Ticket #{$skipped->queue_number}.");
    }

    public function hold(Queue $queue, Request $request, HoldQueueAction $action): RedirectResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        $held = $action->execute(
            queue: $queue,
            user: $request->user(),
            window: $queue->window,
            reason: $request->input('reason')
        );

        return back()->with('info', "Placed Ticket #{$held->queue_number} on Hold.");
    }

    public function resume(Queue $queue, Request $request, ResumeQueueAction $action): RedirectResponse
    {
        $window = Window::findOrFail($request->input('window_id', $queue->window_id));

        $resumed = $action->execute(
            queue: $queue,
            user: $request->user(),
            window: $window
        );

        return back()->with('success', "Resumed Ticket #{$resumed->queue_number}.");
    }

    public function transfer(Queue $queue, TransferQueueRequest $request, TransferQueueAction $action): RedirectResponse
    {
        $result = $action->execute($queue, $request->user(), $request->validated());

        return back()->with('success', "Ticket #{$result['new_queue']->queue_number} transferred to {$result['new_queue']->department->name} - {$result['new_queue']->service->name} (Original ticket number retained — no reprint required).");
    }
}

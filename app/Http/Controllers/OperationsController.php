<?php

namespace App\Http\Controllers;

use App\Actions\Department\UpdateDepartmentStatusAction;
use App\Actions\Queue\CancelQueueAction;
use App\Actions\Queue\ChangeQueuePriorityAction;
use App\Actions\Queue\TransferQueueAction;
use App\Actions\Service\UpdateServiceOperatingHoursAction;
use App\Actions\Service\UpdateServiceStatusAction;
use App\Actions\Window\AssignStaffAction;
use App\Actions\Window\CloseWindowAction;
use App\Actions\Window\OpenWindowAction;
use App\Actions\Window\PauseWindowAction;
use App\Actions\Window\ResumeWindowAction;
use App\Actions\Window\UnassignStaffAction;
use App\Enums\DepartmentStatus;
use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Enums\WindowStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\QueueSetting;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use App\Services\OperationsService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rules\Enum;
use Inertia\Inertia;
use Inertia\Response;

class OperationsController extends Controller
{
    /**
     * Display real-time Operations Dashboard & live counter board.
     */
    public function index(Request $request, OperationsService $service): Response
    {
        $date = $request->input('date', Carbon::today()->format('Y-m-d'));
        $departmentId = $request->integer('department_id') ?: null;

        $metrics = $service->getMetrics($date, $departmentId);
        $board = $service->getOperationsBoard($departmentId, $date);

        $departments = Department::where('is_active', true)
            ->with(['services' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'status']);

        return Inertia::render('Operations/Dashboard', [
            'metrics' => $metrics,
            'board' => $board,
            'departments' => $departments,
            'filters' => [
                'date' => $date,
                'department_id' => $departmentId,
            ],
            'reverbConfig' => [
                'key' => config('reverb.apps.apps.0.key', env('REVERB_APP_KEY')),
                'host' => config('reverb.apps.apps.0.options.host', env('REVERB_HOST', 'localhost')),
                'port' => config('reverb.apps.apps.0.options.port', env('REVERB_PORT', 8080)),
                'scheme' => config('reverb.apps.apps.0.options.scheme', env('REVERB_SCHEME', 'http')),
            ],
        ]);
    }

    /**
     * Display Window Management & Staff Assignment board.
     */
    public function windows(Request $request, OperationsService $service): Response
    {
        $departmentId = $request->integer('department_id') ?: null;

        $board = $service->getOperationsBoard($departmentId);

        $departments = Department::where('is_active', true)
            ->with(['services' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get();

        $staffUsers = User::where('is_active', true)
            ->whereIn('role', [
                UserRole::QueueStaff->value,
                UserRole::WindowStaff->value,
                UserRole::QueueAdmin->value,
                UserRole::HospitalAdmin->value,
                UserRole::SuperAdmin->value,
            ])
            ->with('activeWindowAssignment.window')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return Inertia::render('Operations/Windows', [
            'board' => $board,
            'departments' => $departments,
            'staffUsers' => $staffUsers,
            'filters' => [
                'department_id' => $departmentId,
            ],
            'windowStatuses' => collect(WindowStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
                'badge' => $s->badgeColor(),
            ]),
        ]);
    }

    /**
     * Centralized Queue Control Center.
     */
    public function queues(Request $request, OperationsService $service): Response
    {
        Gate::authorize('viewAny', Queue::class);

        $filters = [
            'search' => $request->input('search'),
            'date' => $request->input('date', Carbon::today()->format('Y-m-d')),
            'department_id' => $request->integer('department_id') ?: null,
            'service_id' => $request->integer('service_id') ?: null,
            'window_id' => $request->integer('window_id') ?: null,
            'status' => $request->input('status'),
            'priority' => $request->input('priority'),
        ];

        $queues = $service->getQueuesForControlCenter($filters, 15);

        $departments = Department::where('is_active', true)
            ->with([
                'services' => fn ($q) => $q->where('is_active', true)->orderBy('name'),
                'windows' => fn ($q) => $q->where('is_active', true)->orderBy('window_number'),
            ])
            ->orderBy('name')
            ->get();

        return Inertia::render('Operations/QueueControl', [
            'queues' => $queues,
            'departments' => $departments,
            'filters' => $filters,
            'statuses' => collect(QueueStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
                'badge' => $s->badgeColor(),
            ]),
            'priorities' => collect(PriorityType::cases())->map(fn ($p) => [
                'value' => $p->value,
                'label' => $p->label(),
                'badge' => $p->badgeColor(),
            ]),
        ]);
    }

    /**
     * Service Operations & Operating Hours Management.
     */
    public function services(Request $request): Response
    {
        $services = Service::with(['department', 'operatingHours'])
            ->orderBy('department_id')
            ->orderBy('name')
            ->get();

        $departments = Department::where('is_active', true)->orderBy('name')->get();
        $settings = QueueSetting::getSettings();

        return Inertia::render('Operations/Services', [
            'services' => $services,
            'departments' => $departments,
            'settings' => $settings,
            'serviceStatuses' => collect(ServiceStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
                'badge' => $s->badgeColor(),
            ]),
            'departmentStatuses' => collect(DepartmentStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
                'badge' => $s->badgeColor(),
            ]),
        ]);
    }

    /**
     * Update Window Status (Open, Close, Pause, Resume).
     */
    public function updateWindowStatus(
        Request $request,
        Window $window,
        OpenWindowAction $openAction,
        CloseWindowAction $closeAction,
        PauseWindowAction $pauseAction,
        ResumeWindowAction $resumeAction
    ): RedirectResponse {
        Gate::authorize('operate', $window);

        $validated = $request->validate([
            'status' => ['required', new Enum(WindowStatus::class)],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
        ]);

        $status = WindowStatus::from($validated['status']);

        match ($status) {
            WindowStatus::Open => $openAction->execute($window, $request->user(), $validated['service_id'] ?? null),
            WindowStatus::Closed, WindowStatus::Offline => $closeAction->execute($window, $request->user()),
            WindowStatus::Paused => $pauseAction->execute($window, $request->user()),
        };

        return back()->with('success', "Window #{$window->window_number} status changed to {$status->label()}.");
    }

    /**
     * Assign staff to a window.
     */
    public function assignStaff(Request $request, Window $window, AssignStaffAction $action): RedirectResponse
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

        $action->execute($window, $staff, $request->user(), $validated['open_window'] ?? true);

        return back()->with('success', "Staff {$staff->name} assigned to Window #{$window->window_number}.");
    }

    /**
     * Unassign staff from a window.
     */
    public function unassignStaff(Request $request, Window $window, UnassignStaffAction $action): RedirectResponse
    {
        Gate::authorize('assign', $window);

        $closeWindow = $request->boolean('close_window', true);
        $action->execute($window, $request->user(), $closeWindow);

        return back()->with('success', "Staff unassigned from Window #{$window->window_number}.");
    }

    /**
     * Update department operational status.
     */
    public function updateDepartmentStatus(Request $request, Department $department, UpdateDepartmentStatusAction $action): RedirectResponse
    {
        Gate::authorize('update', $department);

        $validated = $request->validate([
            'status' => ['required', new Enum(DepartmentStatus::class)],
            'status_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $action->execute(
            $department,
            DepartmentStatus::from($validated['status']),
            $validated['status_reason'] ?? null,
            $request->user()
        );

        return back()->with('success', "Department {$department->name} status updated.");
    }

    /**
     * Update service operational status and capacity limits.
     */
    public function updateServiceStatus(Request $request, Service $service, UpdateServiceStatusAction $action): RedirectResponse
    {
        Gate::authorize('update', $service);

        $validated = $request->validate([
            'status' => ['required', new Enum(ServiceStatus::class)],
            'status_reason' => ['nullable', 'string', 'max:500'],
            'max_waiting_queue' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'max_priority_queue' => ['nullable', 'integer', 'min:0', 'max:500'],
            'max_daily_queue' => ['nullable', 'integer', 'min:0', 'max:5000'],
        ]);

        if (isset($validated['max_daily_queue'])) {
            $service->max_daily_queue = $validated['max_daily_queue'];
            $service->save();
        }

        $action->execute(
            $service,
            ServiceStatus::from($validated['status']),
            $validated['status_reason'] ?? null,
            $validated['max_waiting_queue'] ?? null,
            $validated['max_priority_queue'] ?? null,
            $request->user()
        );

        return back()->with('success', "Service {$service->name} status updated.");
    }

    /**
     * Update service operating hours.
     */
    public function updateServiceOperatingHours(
        Request $request,
        Service $service,
        UpdateServiceOperatingHoursAction $action
    ): RedirectResponse {
        Gate::authorize('update', $service);

        $validated = $request->validate([
            'schedules' => ['required', 'array'],
            'schedules.*.day_of_week' => ['required', 'integer', 'min:1', 'max:7'],
            'schedules.*.open_time' => ['required', 'string'],
            'schedules.*.close_time' => ['required', 'string'],
            'schedules.*.is_enabled' => ['required', 'boolean'],
        ]);

        $action->execute($service, $validated['schedules']);

        return back()->with('success', "Operating hours updated for {$service->name}.");
    }

    /**
     * Transfer a queue ticket.
     */
    public function transferQueue(Request $request, Queue $queue, TransferQueueAction $action): RedirectResponse
    {
        Gate::authorize('transfer', $queue);

        $validated = $request->validate([
            'target_department_id' => ['required', 'integer', 'exists:departments,id'],
            'target_service_id' => ['required', 'integer', 'exists:services,id'],
            'target_window_id' => ['nullable', 'integer', 'exists:windows,id'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $action->execute($queue, $request->user(), $validated);

        return back()->with('success', "Ticket #{$queue->queue_number} transferred to {$result['new_queue']->department->name} - {$result['new_queue']->service->name} (Original ticket number retained — no reprint required).");
    }

    /**
     * Cancel a queue ticket.
     */
    public function cancelQueue(Request $request, Queue $queue, CancelQueueAction $action): RedirectResponse
    {
        Gate::authorize('cancel', $queue);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $action->execute($queue, $request->user(), $validated['reason'] ?? 'Cancelled by administrator');

        return back()->with('success', "Queue #{$queue->queue_number} has been cancelled.");
    }

    /**
     * Change priority of a queue ticket.
     */
    public function changePriority(Request $request, Queue $queue, ChangeQueuePriorityAction $action): RedirectResponse
    {
        Gate::authorize('changePriority', $queue);

        $validated = $request->validate([
            'priority_type' => ['required', new Enum(PriorityType::class)],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $newPriority = PriorityType::from($validated['priority_type']);

        $action->execute($queue, $request->user(), $newPriority, $validated['reason'] ?? null);

        return back()->with('success', "Priority for Queue #{$queue->queue_number} updated to {$newPriority->label()}.");
    }
}

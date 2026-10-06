<?php

namespace App\Services;

use App\Enums\DepartmentStatus;
use App\Enums\QueueStatus;
use App\Enums\ServiceStatus;
use App\Enums\WindowAssignmentStatus;
use App\Enums\WindowStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\Window;
use App\Models\WindowAssignment;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class OperationsService
{
    /**
     * Get aggregate operational metrics for a given date.
     *
     * @return array<string, mixed>
     */
    public function getMetrics(?string $date = null, ?int $departmentId = null): array
    {
        $targetDate = $date ?? Carbon::today()->format('Y-m-d');

        $queueQuery = Queue::whereDate('queue_date', $targetDate)
            ->when($departmentId, fn (Builder $q) => $q->where('department_id', $departmentId));

        $statusCounts = (clone $queueQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $priorityCounts = (clone $queueQuery)
            ->selectRaw('priority_type, count(*) as total')
            ->groupBy('priority_type')
            ->pluck('total', 'priority_type')
            ->all();

        $windowsQuery = Window::query()
            ->when($departmentId, fn (Builder $q) => $q->where('department_id', $departmentId));

        $totalWindows = (clone $windowsQuery)->count();
        $openWindows = (clone $windowsQuery)->where('is_active', true)->where('status', WindowStatus::Open)->count();
        $pausedWindows = (clone $windowsQuery)->where('is_active', true)->where('status', WindowStatus::Paused)->count();
        $closedWindows = (clone $windowsQuery)->where(function ($q) {
            $q->where('is_active', false)->orWhereIn('status', [WindowStatus::Closed, WindowStatus::Offline]);
        })->count();

        $activeStaffCount = WindowAssignment::where('status', WindowAssignmentStatus::Active)
            ->when($departmentId, function (Builder $q) use ($departmentId) {
                $q->whereHas('window', fn ($wq) => $wq->where('department_id', $departmentId));
            })
            ->distinct('user_id')
            ->count('user_id');

        $operatingDepartments = Department::where('is_active', true)
            ->where('status', DepartmentStatus::Open)
            ->count();

        $operatingServices = Service::where('is_active', true)
            ->where('status', ServiceStatus::Available)
            ->when($departmentId, fn (Builder $q) => $q->where('department_id', $departmentId))
            ->count();

        return [
            'date' => $targetDate,
            'summary' => [
                'waiting' => $statusCounts[QueueStatus::Waiting->value] ?? 0,
                'called' => $statusCounts[QueueStatus::Called->value] ?? 0,
                'serving' => $statusCounts[QueueStatus::Serving->value] ?? 0,
                'completed' => $statusCounts[QueueStatus::Completed->value] ?? 0,
                'skipped' => $statusCounts[QueueStatus::Skipped->value] ?? 0,
                'hold' => $statusCounts[QueueStatus::Hold->value] ?? 0,
                'transferred' => $statusCounts[QueueStatus::Transferred->value] ?? 0,
                'cancelled' => $statusCounts[QueueStatus::Cancelled->value] ?? 0,
                'total_tickets' => array_sum($statusCounts),
            ],
            'priorities' => $priorityCounts,
            'windows' => [
                'total' => $totalWindows,
                'open' => $openWindows,
                'paused' => $pausedWindows,
                'closed' => $closedWindows,
            ],
            'staff' => [
                'active_on_duty' => $activeStaffCount,
            ],
            'facilities' => [
                'operating_departments' => $operatingDepartments,
                'operating_services' => $operatingServices,
            ],
        ];
    }

    /**
     * Get live operational board of all windows with real-time stats.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getOperationsBoard(?int $departmentId = null, ?string $date = null): array
    {
        $targetDate = $date ?? Carbon::today()->format('Y-m-d');

        $windows = Window::with([
            'department',
            'service',
            'activeAssignment.user',
            'currentQueue.service',
        ])
            ->when($departmentId, fn (Builder $q) => $q->where('department_id', $departmentId))
            ->orderBy('department_id')
            ->orderBy('window_number')
            ->get();

        // Calculate waiting queues per service for today efficiently in a single query
        $waitingByService = Queue::whereDate('queue_date', $targetDate)
            ->where('status', QueueStatus::Waiting)
            ->selectRaw('service_id, count(*) as total')
            ->groupBy('service_id')
            ->pluck('total', 'service_id')
            ->all();

        return $windows->map(function (Window $w) use ($waitingByService) {
            $serviceId = $w->service_id;
            $waitingCount = $serviceId ? ($waitingByService[$serviceId] ?? 0) : 0;
            $currentQ = $w->currentQueue;

            return [
                'id' => $w->id,
                'window_number' => $w->window_number,
                'name' => $w->name,
                'display_name' => $w->display_name,
                'status' => $w->status->value,
                'status_label' => $w->status->label(),
                'status_badge' => $w->status->badgeColor(),
                'is_active' => $w->is_active,
                'last_activity_at' => $w->last_activity_at?->toIso8601String(),
                'department' => $w->department ? [
                    'id' => $w->department->id,
                    'code' => $w->department->code,
                    'name' => $w->department->name,
                    'status' => $w->department->status->value,
                ] : null,
                'service' => $w->service ? [
                    'id' => $w->service->id,
                    'code' => $w->service->code,
                    'name' => $w->service->name,
                    'prefix' => $w->service->prefix,
                    'status' => $w->service->status->value,
                ] : null,
                'assigned_staff' => $w->activeAssignment?->user ? [
                    'id' => $w->activeAssignment->user->id,
                    'name' => $w->activeAssignment->user->name,
                    'email' => $w->activeAssignment->user->email,
                    'role' => $w->activeAssignment->user->role->value,
                    'assigned_at' => $w->activeAssignment->assigned_at->toIso8601String(),
                ] : null,
                'current_queue' => $currentQ ? [
                    'id' => $currentQ->id,
                    'queue_number' => $currentQ->queue_number,
                    'display_number' => $currentQ->display_number,
                    'status' => $currentQ->status->value,
                    'status_label' => $currentQ->status->label(),
                    'priority_type' => $currentQ->priority_type->value,
                    'called_at' => $currentQ->called_at?->toIso8601String(),
                    'started_at' => $currentQ->started_at?->toIso8601String(),
                    'service_name' => $currentQ->service?->name,
                ] : null,
                'waiting_count' => $waitingCount,
            ];
        })->all();
    }

    /**
     * Get paginated queues for Centralized Queue Control Center with filters.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getQueuesForControlCenter(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $date = $filters['date'] ?? Carbon::today()->format('Y-m-d');

        return Queue::with(['department', 'service', 'window', 'caller', 'server'])
            ->whereDate('queue_date', $date)
            ->when(! empty($filters['search']), function (Builder $q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('queue_number', 'like', "%{$search}%")
                        ->orWhere('patient_name', 'like', "%{$search}%")
                        ->orWhere('patient_reference', 'like', "%{$search}%");
                });
            })
            ->when(! empty($filters['department_id']), fn (Builder $q) => $q->where('department_id', $filters['department_id']))
            ->when(! empty($filters['service_id']), fn (Builder $q) => $q->where('service_id', $filters['service_id']))
            ->when(! empty($filters['window_id']), fn (Builder $q) => $q->where('window_id', $filters['window_id']))
            ->when(! empty($filters['status']), fn (Builder $q) => $q->where('status', $filters['status']))
            ->when(! empty($filters['priority']), fn (Builder $q) => $q->where('priority_type', $filters['priority']))
            ->orderBy('priority_level', 'desc')
            ->orderBy('queue_sequence', 'asc')
            ->paginate($perPage)
            ->withQueryString();
    }
}

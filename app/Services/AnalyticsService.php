<?php

namespace App\Services;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Resolve date range from preset or custom dates.
     *
     * @param  array<string, mixed>  $filters
     * @return array{start_date: string, end_date: string, preset: string}
     */
    public function resolveDateRange(array $filters): array
    {
        $preset = $filters['preset'] ?? 'today';
        $today = Carbon::today();

        switch ($preset) {
            case 'yesterday':
                $startDate = $today->copy()->subDay()->format('Y-m-d');
                $endDate = $startDate;
                break;
            case 'this_week':
                $startDate = $today->copy()->startOfWeek()->format('Y-m-d');
                $endDate = $today->copy()->endOfWeek()->format('Y-m-d');
                break;
            case 'last_week':
                $startDate = $today->copy()->subWeek()->startOfWeek()->format('Y-m-d');
                $endDate = $today->copy()->subWeek()->endOfWeek()->format('Y-m-d');
                break;
            case 'this_month':
                $startDate = $today->copy()->startOfMonth()->format('Y-m-d');
                $endDate = $today->copy()->endOfMonth()->format('Y-m-d');
                break;
            case 'last_month':
                $startDate = $today->copy()->subMonth()->startOfMonth()->format('Y-m-d');
                $endDate = $today->copy()->subMonth()->endOfMonth()->format('Y-m-d');
                break;
            case 'custom':
                $startDate = ! empty($filters['start_date']) ? Carbon::parse($filters['start_date'])->format('Y-m-d') : $today->format('Y-m-d');
                $endDate = ! empty($filters['end_date']) ? Carbon::parse($filters['end_date'])->format('Y-m-d') : $today->format('Y-m-d');
                if ($startDate > $endDate) {
                    $tmp = $startDate;
                    $startDate = $endDate;
                    $endDate = $tmp;
                }
                break;
            case 'today':
            default:
                $preset = 'today';
                $startDate = $today->format('Y-m-d');
                $endDate = $today->format('Y-m-d');
                break;
        }

        // Enforce maximum report range of 365 days to prevent performance issues
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        if ($start->diffInDays($end) > 365) {
            $startDate = $end->copy()->subDays(365)->format('Y-m-d');
        }

        return [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'preset' => $preset,
        ];
    }

    /**
     * Build base query scoped with filters.
     *
     * @param  array<string, mixed>  $filters
     */
    public function buildBaseQueueQuery(array $filters): Builder
    {
        $dates = $this->resolveDateRange($filters);

        $query = Queue::query()
            ->whereDate('queues.queue_date', '>=', $dates['start_date'])
            ->whereDate('queues.queue_date', '<=', $dates['end_date']);

        if (! empty($filters['department_id'])) {
            $query->where('queues.department_id', (int) $filters['department_id']);
        }

        if (! empty($filters['service_id'])) {
            $query->where('queues.service_id', (int) $filters['service_id']);
        }

        if (! empty($filters['window_id'])) {
            $query->where('queues.window_id', (int) $filters['window_id']);
        }

        if (! empty($filters['priority_type'])) {
            $query->where('queues.priority_type', $filters['priority_type']);
        }

        if (! empty($filters['status'])) {
            $query->where('queues.status', $filters['status']);
        }

        return $query;
    }

    /**
     * Helper to get database-specific SQL expression for timestamp diff in seconds.
     */
    public function getDiffSecondsSql(string $startColumn, string $endColumn): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return "(CAST(strftime('%s', {$endColumn}) AS INTEGER) - CAST(strftime('%s', {$startColumn}) AS INTEGER))";
        }

        return "TIMESTAMPDIFF(SECOND, {$startColumn}, {$endColumn})";
    }

    /**
     * Helper to get database-specific SQL expression for extracting the hour (0-23).
     */
    public function getHourSql(string $column): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return "CAST(strftime('%H', {$column}) AS INTEGER)";
        }

        return "HOUR({$column})";
    }

    /**
     * High-level KPI Summary.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getSummary(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters);
        $diffWaitSql = $this->getDiffSecondsSql('created_at', 'called_at');
        $diffServiceSql = $this->getDiffSecondsSql('started_at', 'completed_at');
        $diffTotalSql = $this->getDiffSecondsSql('created_at', 'completed_at');

        $driver = DB::connection()->getDriverName();
        $isSqlite = $driver === 'sqlite';

        $rawStats = (clone $query)->selectRaw("
            COUNT(*) as total_tickets,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completed,
            SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as total_waiting,
            SUM(CASE WHEN status = 'serving' THEN 1 ELSE 0 END) as total_serving,
            SUM(CASE WHEN status = 'called' THEN 1 ELSE 0 END) as total_called,
            SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as total_skipped,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as total_cancelled,
            SUM(CASE WHEN status = 'transferred' THEN 1 ELSE 0 END) as total_transferred,
            SUM(CASE WHEN status = 'hold' THEN 1 ELSE 0 END) as total_held,
            AVG(CASE WHEN called_at IS NOT NULL THEN {$diffWaitSql} ELSE NULL END) as avg_wait_seconds,
            MIN(CASE WHEN called_at IS NOT NULL THEN {$diffWaitSql} ELSE NULL END) as min_wait_seconds,
            MAX(CASE WHEN called_at IS NOT NULL THEN {$diffWaitSql} ELSE NULL END) as max_wait_seconds,
            AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as avg_service_seconds,
            MIN(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as min_service_seconds,
            MAX(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as max_service_seconds,
            AVG(CASE WHEN status = 'completed' AND completed_at IS NOT NULL THEN {$diffTotalSql} ELSE NULL END) as avg_total_seconds,
            MAX(CASE WHEN status = 'completed' AND completed_at IS NOT NULL THEN {$diffTotalSql} ELSE NULL END) as max_total_seconds
        ")->first();

        $totalTickets = (int) ($rawStats->total_tickets ?? 0);
        $totalCompleted = (int) ($rawStats->total_completed ?? 0);
        $totalSkipped = (int) ($rawStats->total_skipped ?? 0);
        $totalCancelled = (int) ($rawStats->total_cancelled ?? 0);
        $totalTransferred = (int) ($rawStats->total_transferred ?? 0);
        $totalWaiting = (int) ($rawStats->total_waiting ?? 0);
        $totalServing = (int) ($rawStats->total_serving ?? 0);
        $totalCalled = (int) ($rawStats->total_called ?? 0);
        $totalHeld = (int) ($rawStats->total_held ?? 0);

        $completionRate = $totalTickets > 0 ? round(($totalCompleted / $totalTickets) * 100, 1) : 0;
        $skipRate = $totalTickets > 0 ? round(($totalSkipped / $totalTickets) * 100, 1) : 0;
        $cancellationRate = $totalTickets > 0 ? round(($totalCancelled / $totalTickets) * 100, 1) : 0;

        // Peak Hour calculation
        $hourSql = $this->getHourSql('created_at');
        $peakHourRow = (clone $query)
            ->selectRaw("{$hourSql} as hour_num, COUNT(*) as count")
            ->groupBy('hour_num')
            ->orderByDesc('count')
            ->first();

        $peakHour = $peakHourRow ? sprintf('%02d:00 - %02d:00 (%d tickets)', $peakHourRow->hour_num, ($peakHourRow->hour_num + 1) % 24, $peakHourRow->count) : 'N/A';

        // Busiest Department
        $busiestDept = (clone $query)
            ->join('departments', 'queues.department_id', '=', 'departments.id')
            ->selectRaw('departments.name as name, COUNT(*) as count')
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('count')
            ->first();

        // Busiest Service
        $busiestServ = (clone $query)
            ->join('services', 'queues.service_id', '=', 'services.id')
            ->selectRaw('services.name as name, COUNT(*) as count')
            ->groupBy('services.id', 'services.name')
            ->orderByDesc('count')
            ->first();

        // Busiest Window
        $busiestWin = (clone $query)
            ->whereNotNull('queues.window_id')
            ->join('windows', 'queues.window_id', '=', 'windows.id')
            ->selectRaw('windows.name as name, windows.window_number, COUNT(*) as count')
            ->groupBy('windows.id', 'windows.name', 'windows.window_number')
            ->orderByDesc('count')
            ->first();

        // Calculate median and 90th percentile wait times efficiently via ordered sample/pluck or SQL percentile
        $waitTimes = (clone $query)
            ->whereNotNull('called_at')
            ->selectRaw("{$diffWaitSql} as wait_seconds")
            ->pluck('wait_seconds')
            ->map(fn ($val) => (int) $val)
            ->sort()
            ->values();

        $medianWaitSeconds = 0;
        $p90WaitSeconds = 0;
        $waitCount = $waitTimes->count();
        if ($waitCount > 0) {
            $midIndex = (int) floor($waitCount / 2);
            $medianWaitSeconds = $waitTimes->get($midIndex) ?? 0;
            $p90Index = (int) floor($waitCount * 0.9);
            $p90WaitSeconds = $waitTimes->get(min($p90Index, $waitCount - 1)) ?? 0;
        }

        // Calculate median and 90th percentile service times
        $serviceTimes = (clone $query)
            ->whereNotNull('completed_at')
            ->whereNotNull('started_at')
            ->selectRaw("{$diffServiceSql} as service_seconds")
            ->pluck('service_seconds')
            ->map(fn ($val) => (int) $val)
            ->sort()
            ->values();

        $medianServiceSeconds = 0;
        $p90ServiceSeconds = 0;
        $serviceCount = $serviceTimes->count();
        if ($serviceCount > 0) {
            $midIndex = (int) floor($serviceCount / 2);
            $medianServiceSeconds = $serviceTimes->get($midIndex) ?? 0;
            $p90Index = (int) floor($serviceCount * 0.9);
            $p90ServiceSeconds = $serviceTimes->get(min($p90Index, $serviceCount - 1)) ?? 0;
        }

        return [
            'total_tickets' => $totalTickets,
            'total_completed' => $totalCompleted,
            'total_waiting' => $totalWaiting,
            'total_serving' => $totalServing,
            'total_called' => $totalCalled,
            'total_skipped' => $totalSkipped,
            'total_cancelled' => $totalCancelled,
            'total_transferred' => $totalTransferred,
            'total_held' => $totalHeld,
            'completion_rate' => $completionRate,
            'skip_rate' => $skipRate,
            'cancellation_rate' => $cancellationRate,
            'avg_wait_seconds' => (int) round($rawStats->avg_wait_seconds ?? 0),
            'min_wait_seconds' => (int) ($rawStats->min_wait_seconds ?? 0),
            'max_wait_seconds' => (int) ($rawStats->max_wait_seconds ?? 0),
            'median_wait_seconds' => $medianWaitSeconds,
            'p90_wait_seconds' => $p90WaitSeconds,
            'avg_service_seconds' => (int) round($rawStats->avg_service_seconds ?? 0),
            'min_service_seconds' => (int) ($rawStats->min_service_seconds ?? 0),
            'max_service_seconds' => (int) ($rawStats->max_service_seconds ?? 0),
            'median_service_seconds' => $medianServiceSeconds,
            'p90_service_seconds' => $p90ServiceSeconds,
            'avg_total_seconds' => (int) round($rawStats->avg_total_seconds ?? 0),
            'max_total_seconds' => (int) ($rawStats->max_total_seconds ?? 0),
            'peak_hour' => $peakHour,
            'busiest_department' => $busiestDept ? "{$busiestDept->name} ({$busiestDept->count})" : 'N/A',
            'busiest_service' => $busiestServ ? "{$busiestServ->name} ({$busiestServ->count})" : 'N/A',
            'busiest_window' => $busiestWin ? "{$busiestWin->name} ({$busiestWin->count})" : 'N/A',
        ];
    }

    /**
     * Volume over time grouped by day, week, or month.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getVolumeOverTime(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters);
        $groupBy = $filters['group_by'] ?? 'day';

        $driver = DB::connection()->getDriverName();
        $isSqlite = $driver === 'sqlite';

        if ($groupBy === 'month') {
            $formatSql = $isSqlite ? "strftime('%Y-%m', queue_date)" : "DATE_FORMAT(queue_date, '%Y-%m')";
        } elseif ($groupBy === 'week') {
            $formatSql = $isSqlite ? "strftime('%Y-W%W', queue_date)" : "DATE_FORMAT(queue_date, '%Y-W%u')";
        } else {
            $formatSql = $isSqlite ? "strftime('%Y-%m-%d', queue_date)" : "DATE_FORMAT(queue_date, '%Y-%m-%d')";
        }

        $results = (clone $query)
            ->selectRaw("
                {$formatSql} as period_label,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'transferred' THEN 1 ELSE 0 END) as transferred
            ")
            ->groupBy('period_label')
            ->orderBy('period_label', 'asc')
            ->get();

        return $results->map(function ($row) {
            return [
                'period' => (string) $row->period_label,
                'total' => (int) $row->total_tickets,
                'completed' => (int) $row->completed,
                'skipped' => (int) $row->skipped,
                'cancelled' => (int) $row->cancelled,
                'transferred' => (int) $row->transferred,
            ];
        })->toArray();
    }

    /**
     * Hourly traffic analysis across the filtered date range.
     *
     * @param  array<string, mixed>  $filters
     * @return array{hours: array<int, array<string, mixed>>, peak_hour: string, lowest_hour: string, avg_hourly_volume: float}
     */
    public function getHourlyTraffic(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters);
        $hourSql = $this->getHourSql('created_at');

        $results = (clone $query)
            ->selectRaw("
                {$hourSql} as hour_num,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            ")
            ->groupBy('hour_num')
            ->orderBy('hour_num', 'asc')
            ->get()
            ->keyBy('hour_num');

        $hours = [];
        $maxCount = -1;
        $minCount = PHP_INT_MAX;
        $peakHourStr = 'N/A';
        $lowestHourStr = 'N/A';
        $totalTraffic = 0;
        $operatingHoursCount = 0;

        for ($h = 6; $h <= 20; $h++) { // standard hospital operating window 06:00 to 20:00
            $row = $results->get($h);
            $count = $row ? (int) $row->total_tickets : 0;
            $completed = $row ? (int) $row->completed : 0;
            $label = sprintf('%02d:00', $h);

            $hours[] = [
                'hour' => $h,
                'label' => $label,
                'range' => sprintf('%02d:00 - %02d:00', $h, ($h + 1) % 24),
                'count' => $count,
                'completed' => $completed,
            ];

            $totalTraffic += $count;
            $operatingHoursCount++;

            if ($count > $maxCount) {
                $maxCount = $count;
                $peakHourStr = sprintf('%02d:00 - %02d:00 (%d tickets)', $h, ($h + 1) % 24, $count);
            }

            if ($count < $minCount) {
                $minCount = $count;
                $lowestHourStr = sprintf('%02d:00 - %02d:00 (%d tickets)', $h, ($h + 1) % 24, $count);
            }
        }

        $avgHourly = $operatingHoursCount > 0 ? round($totalTraffic / $operatingHoursCount, 1) : 0;

        return [
            'hours' => $hours,
            'peak_hour' => $peakHourStr,
            'lowest_hour' => $lowestHourStr,
            'avg_hourly_volume' => $avgHourly,
            'total_volume' => $totalTraffic,
        ];
    }

    /**
     * Wait-time distribution in standard operational buckets.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getWaitTimeDistribution(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters)->whereNotNull('called_at');
        $diffWaitSql = $this->getDiffSecondsSql('created_at', 'called_at');

        $raw = (clone $query)->selectRaw("
            SUM(CASE WHEN {$diffWaitSql} <= 300 THEN 1 ELSE 0 END) as under_5_min,
            SUM(CASE WHEN {$diffWaitSql} > 300 AND {$diffWaitSql} <= 900 THEN 1 ELSE 0 END) as between_5_15_min,
            SUM(CASE WHEN {$diffWaitSql} > 900 AND {$diffWaitSql} <= 1800 THEN 1 ELSE 0 END) as between_15_30_min,
            SUM(CASE WHEN {$diffWaitSql} > 1800 AND {$diffWaitSql} <= 3600 THEN 1 ELSE 0 END) as between_30_60_min,
            SUM(CASE WHEN {$diffWaitSql} > 3600 AND {$diffWaitSql} <= 7200 THEN 1 ELSE 0 END) as between_60_120_min,
            SUM(CASE WHEN {$diffWaitSql} > 7200 THEN 1 ELSE 0 END) as over_120_min,
            COUNT(*) as total_called
        ")->first();

        $total = (int) ($raw->total_called ?? 0);

        $buckets = [
            ['key' => 'under_5_min', 'label' => '< 5 min', 'count' => (int) ($raw->under_5_min ?? 0)],
            ['key' => 'between_5_15_min', 'label' => '5–15 min', 'count' => (int) ($raw->between_5_15_min ?? 0)],
            ['key' => 'between_15_30_min', 'label' => '15–30 min', 'count' => (int) ($raw->between_15_30_min ?? 0)],
            ['key' => 'between_30_60_min', 'label' => '30–60 min', 'count' => (int) ($raw->between_30_60_min ?? 0)],
            ['key' => 'between_60_120_min', 'label' => '60–120 min', 'count' => (int) ($raw->between_60_120_min ?? 0)],
            ['key' => 'over_120_min', 'label' => '> 120 min', 'count' => (int) ($raw->over_120_min ?? 0)],
        ];

        return array_map(function ($b) use ($total) {
            $b['percentage'] = $total > 0 ? round(($b['count'] / $total) * 100, 1) : 0;

            return $b;
        }, $buckets);
    }

    /**
     * Breakdown by Queue Status.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getStatusBreakdown(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters);

        $results = (clone $query)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $total = $results->sum('count');

        $allStatuses = [
            QueueStatus::Completed->value => 'Completed',
            QueueStatus::Skipped->value => 'Skipped',
            QueueStatus::Cancelled->value => 'Cancelled',
            QueueStatus::Transferred->value => 'Transferred',
            QueueStatus::Hold->value => 'On Hold',
            QueueStatus::Serving->value => 'Serving',
            QueueStatus::Called->value => 'Called',
            QueueStatus::Waiting->value => 'Waiting',
        ];

        $countsByStatus = $results->mapWithKeys(function ($item) {
            $statusKey = $item->status instanceof QueueStatus ? $item->status->value : (string) $item->status;

            return [$statusKey => (int) $item->count];
        });

        $breakdown = [];
        foreach ($allStatuses as $statusKey => $label) {
            $count = (int) ($countsByStatus->get($statusKey) ?? 0);
            $breakdown[] = [
                'status' => $statusKey,
                'label' => $label,
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
            ];
        }

        return $breakdown;
    }

    /**
     * Priority Breakdown and Metrics.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getPriorityAnalytics(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters);
        $diffWaitSql = $this->getDiffSecondsSql('created_at', 'called_at');
        $diffServiceSql = $this->getDiffSecondsSql('started_at', 'completed_at');

        $results = (clone $query)
            ->selectRaw("
                priority_type,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                AVG(CASE WHEN called_at IS NOT NULL THEN {$diffWaitSql} ELSE NULL END) as avg_wait_seconds,
                AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as avg_service_seconds
            ")
            ->groupBy('priority_type')
            ->get();

        $rowsByPriority = $results->mapWithKeys(function ($item) {
            $key = $item->priority_type instanceof PriorityType ? $item->priority_type->value : (string) $item->priority_type;

            return [$key => $item];
        });

        $priorities = [
            PriorityType::Regular->value => 'Regular',
            PriorityType::Senior->value => 'Senior Citizen',
            PriorityType::Pwd->value => 'PWD',
            PriorityType::Pregnant->value => 'Pregnant',
            PriorityType::Emergency->value => 'Emergency',
        ];

        $list = [];
        foreach ($priorities as $type => $label) {
            $row = $rowsByPriority->get($type);
            $total = $row ? (int) $row->total_tickets : 0;
            $completed = $row ? (int) $row->completed : 0;
            $skipped = $row ? (int) $row->skipped : 0;
            $cancelled = $row ? (int) $row->cancelled : 0;

            $list[] = [
                'priority_type' => $type,
                'label' => $label,
                'total' => $total,
                'completed' => $completed,
                'skipped' => $skipped,
                'cancelled' => $cancelled,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'avg_wait_seconds' => (int) round($row?->avg_wait_seconds ?? 0),
                'avg_service_seconds' => (int) round($row?->avg_service_seconds ?? 0),
            ];
        }

        return $list;
    }

    /**
     * Department Performance Table.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getDepartmentPerformance(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters);
        $diffWaitSql = $this->getDiffSecondsSql('queues.created_at', 'queues.called_at');
        $diffServiceSql = $this->getDiffSecondsSql('queues.started_at', 'queues.completed_at');

        $results = (clone $query)
            ->join('departments', 'queues.department_id', '=', 'departments.id')
            ->selectRaw("
                departments.id as department_id,
                departments.code as department_code,
                departments.name as department_name,
                departments.target_wait_time_minutes,
                COUNT(queues.id) as total_tickets,
                SUM(CASE WHEN queues.status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN queues.status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                SUM(CASE WHEN queues.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN queues.status = 'transferred' THEN 1 ELSE 0 END) as transferred,
                AVG(CASE WHEN queues.called_at IS NOT NULL THEN {$diffWaitSql} ELSE NULL END) as avg_wait_seconds,
                AVG(CASE WHEN queues.completed_at IS NOT NULL AND queues.started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as avg_service_seconds
            ")
            ->groupBy('departments.id', 'departments.code', 'departments.name', 'departments.target_wait_time_minutes')
            ->orderByDesc('total_tickets')
            ->get();

        return $results->map(function ($row) {
            $total = (int) $row->total_tickets;
            $completed = (int) $row->completed;
            $skipped = (int) $row->skipped;
            $avgWaitSec = (int) round($row->avg_wait_seconds ?? 0);
            $avgWaitMin = round($avgWaitSec / 60, 1);
            $targetWaitMin = $row->target_wait_time_minutes ? (int) $row->target_wait_time_minutes : null;

            $compliancePercentage = null;
            if ($targetWaitMin !== null && $total > 0) {
                // If average wait is <= target, compliance is positive
                $compliancePercentage = $avgWaitMin <= $targetWaitMin ? 100 : round(($targetWaitMin / max($avgWaitMin, 1)) * 100, 1);
            }

            return [
                'department_id' => (int) $row->department_id,
                'code' => (string) $row->department_code,
                'name' => (string) $row->department_name,
                'total_tickets' => $total,
                'completed' => $completed,
                'skipped' => $skipped,
                'cancelled' => (int) $row->cancelled,
                'transferred' => (int) $row->transferred,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'skip_rate' => $total > 0 ? round(($skipped / $total) * 100, 1) : 0,
                'avg_wait_seconds' => $avgWaitSec,
                'avg_service_seconds' => (int) round($row->avg_service_seconds ?? 0),
                'target_wait_time_minutes' => $targetWaitMin,
                'sla_compliance' => $compliancePercentage,
            ];
        })->toArray();
    }

    /**
     * Service Performance Table.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getServicePerformance(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters);
        $diffWaitSql = $this->getDiffSecondsSql('queues.created_at', 'queues.called_at');
        $diffServiceSql = $this->getDiffSecondsSql('queues.started_at', 'queues.completed_at');

        $results = (clone $query)
            ->join('services', 'queues.service_id', '=', 'services.id')
            ->join('departments', 'queues.department_id', '=', 'departments.id')
            ->selectRaw("
                services.id as service_id,
                services.code as service_code,
                services.name as service_name,
                services.prefix as service_prefix,
                services.target_wait_time_minutes,
                services.target_service_time_minutes,
                departments.id as department_id,
                departments.name as department_name,
                COUNT(queues.id) as total_tickets,
                SUM(CASE WHEN queues.status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN queues.status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                SUM(CASE WHEN queues.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                AVG(CASE WHEN queues.called_at IS NOT NULL THEN {$diffWaitSql} ELSE NULL END) as avg_wait_seconds,
                AVG(CASE WHEN queues.completed_at IS NOT NULL AND queues.started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as avg_service_seconds
            ")
            ->groupBy(
                'services.id',
                'services.code',
                'services.name',
                'services.prefix',
                'services.target_wait_time_minutes',
                'services.target_service_time_minutes',
                'departments.id',
                'departments.name'
            )
            ->orderByDesc('total_tickets')
            ->get();

        return $results->map(function ($row) {
            $total = (int) $row->total_tickets;
            $completed = (int) $row->completed;
            $skipped = (int) $row->skipped;
            $cancelled = (int) $row->cancelled;
            $avgWaitSec = (int) round($row->avg_wait_seconds ?? 0);
            $avgWaitMin = round($avgWaitSec / 60, 1);
            $targetWaitMin = $row->target_wait_time_minutes ? (int) $row->target_wait_time_minutes : null;

            return [
                'service_id' => (int) $row->service_id,
                'code' => (string) $row->service_code,
                'name' => (string) $row->service_name,
                'prefix' => (string) $row->service_prefix,
                'department_id' => (int) $row->department_id,
                'department_name' => (string) $row->department_name,
                'total_tickets' => $total,
                'completed' => $completed,
                'skipped' => $skipped,
                'cancelled' => $cancelled,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'skip_rate' => $total > 0 ? round(($skipped / $total) * 100, 1) : 0,
                'cancellation_rate' => $total > 0 ? round(($cancelled / $total) * 100, 1) : 0,
                'avg_wait_seconds' => $avgWaitSec,
                'avg_service_seconds' => (int) round($row->avg_service_seconds ?? 0),
                'target_wait_time_minutes' => $targetWaitMin,
                'target_service_time_minutes' => $row->target_service_time_minutes ? (int) $row->target_service_time_minutes : null,
            ];
        })->toArray();
    }

    /**
     * Window Operational Performance.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getWindowPerformance(array $filters): array
    {
        $query = $this->buildBaseQueueQuery($filters)->whereNotNull('queues.window_id');
        $diffWaitSql = $this->getDiffSecondsSql('queues.created_at', 'queues.called_at');
        $diffServiceSql = $this->getDiffSecondsSql('queues.started_at', 'queues.completed_at');

        $results = (clone $query)
            ->join('windows', 'queues.window_id', '=', 'windows.id')
            ->join('departments', 'windows.department_id', '=', 'departments.id')
            ->selectRaw("
                windows.id as window_id,
                windows.name as window_name,
                windows.window_number,
                departments.name as department_name,
                COUNT(queues.id) as tickets_served,
                SUM(CASE WHEN queues.status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN queues.status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                SUM(CASE WHEN queues.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                AVG(CASE WHEN queues.called_at IS NOT NULL THEN {$diffWaitSql} ELSE NULL END) as avg_wait_seconds,
                AVG(CASE WHEN queues.completed_at IS NOT NULL AND queues.started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as avg_service_seconds
            ")
            ->groupBy('windows.id', 'windows.name', 'windows.window_number', 'departments.name')
            ->orderByDesc('tickets_served')
            ->get();

        // Eager load active staff for these windows
        $windowIds = $results->pluck('window_id')->all();
        $windowsWithStaff = Window::with('activeAssignment.user')->whereIn('id', $windowIds)->get()->keyBy('id');

        return $results->map(function ($row) use ($windowsWithStaff) {
            $window = $windowsWithStaff->get($row->window_id);
            $assignedStaff = $window?->activeAssignment?->user?->name ?? 'Unassigned';
            $total = (int) $row->tickets_served;
            $completed = (int) $row->completed;
            $skipped = (int) $row->skipped;
            $cancelled = (int) $row->cancelled;

            return [
                'window_id' => (int) $row->window_id,
                'name' => (string) $row->window_name,
                'window_number' => (int) $row->window_number,
                'department_name' => (string) $row->department_name,
                'assigned_staff' => $assignedStaff,
                'tickets_served' => $total,
                'completed' => $completed,
                'skipped' => $skipped,
                'cancelled' => $cancelled,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'skip_rate' => $total > 0 ? round(($skipped / $total) * 100, 1) : 0,
                'avg_wait_seconds' => (int) round($row->avg_wait_seconds ?? 0),
                'avg_service_seconds' => (int) round($row->avg_service_seconds ?? 0),
            ];
        })->toArray();
    }

    /**
     * Staff Operational Activity (neutral operational monitoring).
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getStaffActivity(array $filters): array
    {
        $dates = $this->resolveDateRange($filters);
        $diffServiceSql = $this->getDiffSecondsSql('queues.started_at', 'queues.completed_at');

        $results = Queue::query()
            ->whereDate('queue_date', '>=', $dates['start_date'])
            ->whereDate('queue_date', '<=', $dates['end_date'])
            ->whereNotNull('served_by')
            ->join('users', 'queues.served_by', '=', 'users.id')
            ->selectRaw("
                users.id as user_id,
                users.name as staff_name,
                users.role as staff_role,
                COUNT(queues.id) as queues_handled,
                SUM(CASE WHEN queues.status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN queues.status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                AVG(CASE WHEN queues.completed_at IS NOT NULL AND queues.started_at IS NOT NULL THEN {$diffServiceSql} ELSE NULL END) as avg_service_seconds
            ")
            ->groupBy('users.id', 'users.name', 'users.role')
            ->orderByDesc('queues_handled')
            ->get();

        return $results->map(function ($row) {
            $total = (int) $row->queues_handled;
            $completed = (int) $row->completed;

            return [
                'user_id' => (int) $row->user_id,
                'staff_name' => (string) $row->staff_name,
                'role' => is_object($row->staff_role) ? $row->staff_role->value : (string) $row->staff_role,
                'queues_handled' => $total,
                'completed' => $completed,
                'skipped' => (int) $row->skipped,
                'avg_service_seconds' => (int) round($row->avg_service_seconds ?? 0),
            ];
        })->toArray();
    }

    /**
     * Inter-department & Service Transfer Analytics.
     *
     * @param  array<string, mixed>  $filters
     * @return array{total_transfers: int, routes: array<int, array<string, mixed>>}
     */
    public function getTransferAnalytics(array $filters): array
    {
        $dates = $this->resolveDateRange($filters);

        $results = Queue::query()
            ->whereDate('queues.queue_date', '>=', $dates['start_date'])
            ->whereDate('queues.queue_date', '<=', $dates['end_date'])
            ->where('queues.status', QueueStatus::Transferred->value)
            ->join('departments as from_dept', 'queues.department_id', '=', 'from_dept.id')
            ->leftJoin('departments as to_dept', 'queues.transfer_to_department_id', '=', 'to_dept.id')
            ->join('services as from_serv', 'queues.service_id', '=', 'from_serv.id')
            ->leftJoin('services as to_serv', 'queues.transfer_to_service_id', '=', 'to_serv.id')
            ->selectRaw('
                from_dept.name as from_department,
                to_dept.name as to_department,
                from_serv.name as from_service,
                to_serv.name as to_service,
                COUNT(queues.id) as count
            ')
            ->groupBy('from_dept.name', 'to_dept.name', 'from_serv.name', 'to_serv.name')
            ->orderByDesc('count')
            ->get();

        $routes = $results->map(function ($row) {
            $toDept = $row->to_department ?? 'Same Department';
            $toServ = $row->to_service ?? 'Standard Intake';

            return [
                'route_label' => "{$row->from_department} ({$row->from_service}) → {$toDept} ({$toServ})",
                'from_department' => (string) $row->from_department,
                'to_department' => (string) $toDept,
                'from_service' => (string) $row->from_service,
                'to_service' => (string) $toServ,
                'count' => (int) $row->count,
            ];
        })->toArray();

        $totalTransfers = array_sum(array_column($routes, 'count'));

        return [
            'total_transfers' => $totalTransfers,
            'routes' => $routes,
        ];
    }

    /**
     * SLA / Target Wait Time Compliance Breakdown.
     *
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function getSlaCompliance(array $filters): array
    {
        $dates = $this->resolveDateRange($filters);
        $diffWaitSql = $this->getDiffSecondsSql('queues.created_at', 'queues.called_at');

        $services = Service::with('department')
            ->where('is_active', true)
            ->get();

        $slaData = [];

        foreach ($services as $service) {
            $targetMin = $service->target_wait_time_minutes;
            $targetSec = $targetMin ? $targetMin * 60 : null;

            $queues = Queue::query()
                ->where('service_id', $service->id)
                ->whereDate('queue_date', '>=', $dates['start_date'])
                ->whereDate('queue_date', '<=', $dates['end_date'])
                ->whereNotNull('called_at');

            $totalCalled = (clone $queues)->count();

            if ($targetSec !== null && $totalCalled > 0) {
                $withinTarget = (clone $queues)->whereRaw("{$diffWaitSql} <= ?", [$targetSec])->count();
                $exceedingTarget = $totalCalled - $withinTarget;
                $avgWaitSec = (int) round((clone $queues)->selectRaw("AVG({$diffWaitSql}) as avg_sec")->value('avg_sec') ?? 0);
                $compliancePercent = round(($withinTarget / $totalCalled) * 100, 1);
            } else {
                $withinTarget = null;
                $exceedingTarget = null;
                $avgWaitSec = $totalCalled > 0 ? (int) round((clone $queues)->selectRaw("AVG({$diffWaitSql}) as avg_sec")->value('avg_sec') ?? 0) : 0;
                $compliancePercent = null;
            }

            $slaData[] = [
                'service_id' => $service->id,
                'service_name' => $service->name,
                'department_name' => $service->department?->name ?? 'General',
                'target_wait_minutes' => $targetMin,
                'target_configured' => $targetMin !== null,
                'actual_avg_wait_seconds' => $avgWaitSec,
                'total_called' => $totalCalled,
                'within_target' => $withinTarget,
                'exceeding_target' => $exceedingTarget,
                'compliance_percentage' => $compliancePercent,
            ];
        }

        return $slaData;
    }

    /**
     * Get Complete Analytics Dashboard Data Package.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getDashboardData(array $filters): array
    {
        $dates = $this->resolveDateRange($filters);

        // Fetch master filter items
        $departments = Department::where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get();
        $services = Service::where('is_active', true)->select('id', 'name', 'code', 'department_id')->orderBy('name')->get();
        $windows = Window::where('is_active', true)->select('id', 'name', 'window_number', 'department_id')->orderBy('window_number')->get();

        return [
            'filters' => [
                'start_date' => $dates['start_date'],
                'end_date' => $dates['end_date'],
                'preset' => $dates['preset'],
                'department_id' => ! empty($filters['department_id']) ? (int) $filters['department_id'] : null,
                'service_id' => ! empty($filters['service_id']) ? (int) $filters['service_id'] : null,
                'window_id' => ! empty($filters['window_id']) ? (int) $filters['window_id'] : null,
                'priority_type' => ! empty($filters['priority_type']) ? (string) $filters['priority_type'] : null,
                'status' => ! empty($filters['status']) ? (string) $filters['status'] : null,
                'group_by' => $filters['group_by'] ?? 'day',
            ],
            'options' => [
                'departments' => $departments,
                'services' => $services,
                'windows' => $windows,
            ],
            'summary' => $this->getSummary($filters),
            'volume' => $this->getVolumeOverTime($filters),
            'hourly' => $this->getHourlyTraffic($filters),
            'waitTimeDistribution' => $this->getWaitTimeDistribution($filters),
            'statusBreakdown' => $this->getStatusBreakdown($filters),
            'priorityAnalytics' => $this->getPriorityAnalytics($filters),
            'departmentPerformance' => $this->getDepartmentPerformance($filters),
            'servicePerformance' => $this->getServicePerformance($filters),
            'windowPerformance' => $this->getWindowPerformance($filters),
            'slaCompliance' => $this->getSlaCompliance($filters),
            'transfers' => $this->getTransferAnalytics($filters),
        ];
    }
}

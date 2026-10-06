<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsFilterRequest;
use App\Policies\AnalyticsPolicy;
use App\Services\AnalyticsService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsApiController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService,
        protected ReportService $reportService
    ) {}

    /**
     * High-level KPI summary.
     */
    public function summary(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $summary = $this->analyticsService->getSummary($filters);
        $dates = $this->analyticsService->resolveDateRange($filters);

        return response()->json([
            'success' => true,
            'period' => $dates,
            'data' => $summary,
        ]);
    }

    /**
     * Queue volume aggregated over time.
     */
    public function volume(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $volume = $this->analyticsService->getVolumeOverTime($filters);

        return response()->json([
            'success' => true,
            'data' => $volume,
        ]);
    }

    /**
     * Hourly traffic breakdown.
     */
    public function hourly(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $hourly = $this->analyticsService->getHourlyTraffic($filters);

        return response()->json([
            'success' => true,
            'data' => $hourly,
        ]);
    }

    /**
     * Wait time distribution & metrics.
     */
    public function waitingTime(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $distribution = $this->analyticsService->getWaitTimeDistribution($filters);

        return response()->json([
            'success' => true,
            'data' => $distribution,
        ]);
    }

    /**
     * Department performance metrics.
     */
    public function departments(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $departments = $this->analyticsService->getDepartmentPerformance($filters);

        return response()->json([
            'success' => true,
            'data' => $departments,
        ]);
    }

    /**
     * Service performance metrics.
     */
    public function services(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $services = $this->analyticsService->getServicePerformance($filters);

        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }

    /**
     * Window operational performance metrics.
     */
    public function windows(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $windows = $this->analyticsService->getWindowPerformance($filters);

        return response()->json([
            'success' => true,
            'data' => $windows,
        ]);
    }

    /**
     * Priority category volume and performance.
     */
    public function priorities(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $priorities = $this->analyticsService->getPriorityAnalytics($filters);

        return response()->json([
            'success' => true,
            'data' => $priorities,
        ]);
    }

    /**
     * Inter-department & service transfers.
     */
    public function transfers(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $transfers = $this->analyticsService->getTransferAnalytics($filters);

        return response()->json([
            'success' => true,
            'data' => $transfers,
        ]);
    }

    /**
     * SLA target compliance metrics.
     */
    public function sla(AnalyticsFilterRequest $request): JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $sla = $this->analyticsService->getSlaCompliance($filters);

        return response()->json([
            'success' => true,
            'data' => $sla,
        ]);
    }

    /**
     * Export report data via API.
     */
    public function export(AnalyticsFilterRequest $request): StreamedResponse|JsonResponse
    {
        abort_unless((new AnalyticsPolicy)->export($request->user()), 403, 'Unauthorized to export reports.');

        $filters = $request->validated();
        $reportType = $request->input('report_type', 'summary');
        $format = $request->input('format', 'csv');

        // Audit log
        $this->reportService->logAudit(
            reportType: $reportType,
            format: $format,
            filters: $filters,
            user: $request->user(),
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );

        if ($format === 'csv') {
            return $this->reportService->exportCsv($reportType, $filters, $request->user());
        }

        // JSON format export
        $data = match ($reportType) {
            'department_performance' => $this->analyticsService->getDepartmentPerformance($filters),
            'service_performance' => $this->analyticsService->getServicePerformance($filters),
            'window_performance' => $this->analyticsService->getWindowPerformance($filters),
            'waiting_time' => $this->analyticsService->getWaitTimeDistribution($filters),
            'priority_analysis' => $this->analyticsService->getPriorityAnalytics($filters),
            'sla_compliance' => $this->analyticsService->getSlaCompliance($filters),
            'transfers' => $this->analyticsService->getTransferAnalytics($filters),
            default => $this->analyticsService->getSummary($filters),
        };

        return response()->json([
            'success' => true,
            'report_type' => $reportType,
            'data' => $data,
        ]);
    }
}

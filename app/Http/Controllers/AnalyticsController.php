<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyticsFilterRequest;
use App\Models\Department;
use App\Models\Service;
use App\Policies\AnalyticsPolicy;
use App\Services\AnalyticsService;
use App\Services\ReportService;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService,
        protected ReportService $reportService
    ) {}

    /**
     * Display the main analytics & queue performance dashboard.
     */
    public function index(AnalyticsFilterRequest $request): Response
    {
        abort_unless((new AnalyticsPolicy)->view($request->user()), 403, 'Unauthorized to view analytics.');

        $filters = $request->validated();
        $dashboardData = $this->analyticsService->getDashboardData($filters);

        $canExport = (new AnalyticsPolicy)->export($request->user());

        return Inertia::render('Analytics/Dashboard', array_merge($dashboardData, [
            'canExport' => $canExport,
            'canViewHospitalWide' => (new AnalyticsPolicy)->viewHospitalWide($request->user()),
        ]));
    }

    /**
     * Drill-down analytics for a specific department.
     */
    public function department(AnalyticsFilterRequest $request, Department $department): Response
    {
        abort_unless((new AnalyticsPolicy)->viewDepartment($request->user(), $department), 403, 'Unauthorized to view department analytics.');

        $filters = $request->validated();
        $filters['department_id'] = $department->id;

        $dashboardData = $this->analyticsService->getDashboardData($filters);
        $canExport = (new AnalyticsPolicy)->export($request->user());

        return Inertia::render('Analytics/DepartmentDrillDown', array_merge($dashboardData, [
            'selectedDepartment' => $department->only(['id', 'code', 'name', 'description', 'target_wait_time_minutes']),
            'canExport' => $canExport,
        ]));
    }

    /**
     * Drill-down analytics for a specific service.
     */
    public function service(AnalyticsFilterRequest $request, Service $service): Response
    {
        abort_unless((new AnalyticsPolicy)->viewDepartment($request->user(), $service->department), 403, 'Unauthorized to view service analytics.');

        $filters = $request->validated();
        $filters['service_id'] = $service->id;
        $filters['department_id'] = $service->department_id;

        $dashboardData = $this->analyticsService->getDashboardData($filters);
        $canExport = (new AnalyticsPolicy)->export($request->user());

        return Inertia::render('Analytics/ServiceDrillDown', array_merge($dashboardData, [
            'selectedService' => $service->load('department')->only(['id', 'code', 'name', 'prefix', 'target_wait_time_minutes', 'target_service_time_minutes', 'department']),
            'canExport' => $canExport,
        ]));
    }

    /**
     * Export reports (CSV / PDF layout).
     */
    public function export(AnalyticsFilterRequest $request): StreamedResponse|Response
    {
        abort_unless((new AnalyticsPolicy)->export($request->user()), 403, 'Unauthorized to export reports.');

        $filters = $request->validated();
        $reportType = $request->input('report_type', 'summary');
        $format = $request->input('format', 'csv');

        // Audit report generation
        $this->reportService->logAudit(
            reportType: $reportType,
            format: $format,
            filters: $filters,
            user: $request->user(),
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );

        if ($format === 'pdf') {
            $dates = $this->analyticsService->resolveDateRange($filters);
            $summary = $this->analyticsService->getSummary($filters);
            $departmentPerf = $this->analyticsService->getDepartmentPerformance($filters);
            $servicePerf = $this->analyticsService->getServicePerformance($filters);
            $windowPerf = $this->analyticsService->getWindowPerformance($filters);
            $sla = $this->analyticsService->getSlaCompliance($filters);
            $priority = $this->analyticsService->getPriorityAnalytics($filters);
            $waitDist = $this->analyticsService->getWaitTimeDistribution($filters);

            return Inertia::render('Analytics/PrintReport', [
                'reportType' => $reportType,
                'filters' => $filters,
                'dates' => $dates,
                'summary' => $summary,
                'departmentPerformance' => $departmentPerf,
                'servicePerformance' => $servicePerf,
                'windowPerformance' => $windowPerf,
                'slaCompliance' => $sla,
                'priorityAnalytics' => $priority,
                'waitTimeDistribution' => $waitDist,
                'generatedBy' => $request->user()->name,
                'generatedAt' => now()->toDateTimeString(),
            ]);
        }

        return $this->reportService->exportCsv($reportType, $filters, $request->user());
    }
}

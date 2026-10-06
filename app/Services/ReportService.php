<?php

namespace App\Services;

use App\Models\ReportAuditLog;
use App\Models\User;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportService
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    /**
     * Record report generation in audit log.
     *
     * @param  array<string, mixed>  $filters
     */
    public function logAudit(
        string $reportType,
        string $format,
        array $filters,
        ?User $user,
        ?string $ipAddress,
        ?string $userAgent
    ): ReportAuditLog {
        return ReportAuditLog::create([
            'user_id' => $user?->id,
            'report_type' => $reportType,
            'format' => $format,
            'filters' => $filters,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent ? substr($userAgent, 0, 250) : null,
            'generated_at' => Carbon::now(),
        ]);
    }

    /**
     * Generate Streaming CSV response for a report type.
     *
     * @param  array<string, mixed>  $filters
     */
    public function exportCsv(string $reportType, array $filters, ?User $user = null): StreamedResponse
    {
        $dates = $this->analyticsService->resolveDateRange($filters);
        $filename = sprintf('medqueue_%s_%s_to_%s.csv', $reportType, $dates['start_date'], $dates['end_date']);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($reportType, $filters, $dates) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // Metadata Header
            fputcsv($handle, ['MedQueue — Hospital Queue Operational Report']);
            fputcsv($handle, ['Report Type', strtoupper(str_replace('_', ' ', $reportType))]);
            fputcsv($handle, ['Reporting Period', "{$dates['start_date']} to {$dates['end_date']} ({$dates['preset']})"]);
            fputcsv($handle, ['Generated At', Carbon::now()->toDateTimeString()]);
            fputcsv($handle, []); // blank line

            switch ($reportType) {
                case 'department_performance':
                    $data = $this->analyticsService->getDepartmentPerformance($filters);
                    fputcsv($handle, ['Department Code', 'Department Name', 'Total Tickets', 'Completed', 'Skipped', 'Cancelled', 'Transferred', 'Completion Rate (%)', 'Skip Rate (%)', 'Avg Wait (mins)', 'Avg Service (mins)', 'SLA Target (mins)', 'SLA Compliance (%)']);
                    foreach ($data as $row) {
                        fputcsv($handle, [
                            $row['code'],
                            $row['name'],
                            $row['total_tickets'],
                            $row['completed'],
                            $row['skipped'],
                            $row['cancelled'],
                            $row['transferred'],
                            $row['completion_rate'].'%',
                            $row['skip_rate'].'%',
                            round($row['avg_wait_seconds'] / 60, 1),
                            round($row['avg_service_seconds'] / 60, 1),
                            $row['target_wait_time_minutes'] ?? 'Not Configured',
                            $row['sla_compliance'] !== null ? $row['sla_compliance'].'%' : 'N/A',
                        ]);
                    }
                    break;

                case 'service_performance':
                    $data = $this->analyticsService->getServicePerformance($filters);
                    fputcsv($handle, ['Service Code', 'Service Name', 'Prefix', 'Department', 'Total Tickets', 'Completed', 'Skipped', 'Cancelled', 'Completion Rate (%)', 'Skip Rate (%)', 'Cancellation Rate (%)', 'Avg Wait (mins)', 'Avg Service (mins)', 'Target Wait (mins)']);
                    foreach ($data as $row) {
                        fputcsv($handle, [
                            $row['code'],
                            $row['name'],
                            $row['prefix'],
                            $row['department_name'],
                            $row['total_tickets'],
                            $row['completed'],
                            $row['skipped'],
                            $row['cancelled'],
                            $row['completion_rate'].'%',
                            $row['skip_rate'].'%',
                            $row['cancellation_rate'].'%',
                            round($row['avg_wait_seconds'] / 60, 1),
                            round($row['avg_service_seconds'] / 60, 1),
                            $row['target_wait_time_minutes'] ?? 'Not Configured',
                        ]);
                    }
                    break;

                case 'window_performance':
                    $data = $this->analyticsService->getWindowPerformance($filters);
                    fputcsv($handle, ['Window Number', 'Window Name', 'Department', 'Assigned Staff', 'Tickets Served', 'Completed', 'Skipped', 'Cancelled', 'Completion Rate (%)', 'Skip Rate (%)', 'Avg Wait (mins)', 'Avg Service (mins)']);
                    foreach ($data as $row) {
                        fputcsv($handle, [
                            $row['window_number'],
                            $row['name'],
                            $row['department_name'],
                            $row['assigned_staff'],
                            $row['tickets_served'],
                            $row['completed'],
                            $row['skipped'],
                            $row['cancelled'],
                            $row['completion_rate'].'%',
                            $row['skip_rate'].'%',
                            round($row['avg_wait_seconds'] / 60, 1),
                            round($row['avg_service_seconds'] / 60, 1),
                        ]);
                    }
                    break;

                case 'priority_analysis':
                    $data = $this->analyticsService->getPriorityAnalytics($filters);
                    fputcsv($handle, ['Priority Category', 'Total Tickets', 'Completed', 'Skipped', 'Cancelled', 'Completion Rate (%)', 'Avg Wait (mins)', 'Avg Service (mins)']);
                    foreach ($data as $row) {
                        fputcsv($handle, [
                            $row['label'],
                            $row['total'],
                            $row['completed'],
                            $row['skipped'],
                            $row['cancelled'],
                            $row['completion_rate'].'%',
                            round($row['avg_wait_seconds'] / 60, 1),
                            round($row['avg_service_seconds'] / 60, 1),
                        ]);
                    }
                    break;

                case 'waiting_time':
                    $data = $this->analyticsService->getWaitTimeDistribution($filters);
                    fputcsv($handle, ['Wait Time Bucket', 'Ticket Count', 'Percentage (%)']);
                    foreach ($data as $row) {
                        fputcsv($handle, [
                            $row['label'],
                            $row['count'],
                            $row['percentage'].'%',
                        ]);
                    }
                    break;

                case 'sla_compliance':
                    $data = $this->analyticsService->getSlaCompliance($filters);
                    fputcsv($handle, ['Service', 'Department', 'Target Wait (mins)', 'Actual Avg Wait (mins)', 'Total Called', 'Within Target', 'Exceeding Target', 'Compliance (%)']);
                    foreach ($data as $row) {
                        fputcsv($handle, [
                            $row['service_name'],
                            $row['department_name'],
                            $row['target_configured'] ? $row['target_wait_minutes'].' min' : 'Not Configured',
                            round($row['actual_avg_wait_seconds'] / 60, 1).' min',
                            $row['total_called'],
                            $row['within_target'] ?? 'N/A',
                            $row['exceeding_target'] ?? 'N/A',
                            $row['compliance_percentage'] !== null ? $row['compliance_percentage'].'%' : 'N/A',
                        ]);
                    }
                    break;

                case 'transfers':
                    $data = $this->analyticsService->getTransferAnalytics($filters);
                    fputcsv($handle, ['From Department', 'From Service', 'To Department', 'To Service', 'Transfer Count']);
                    foreach ($data['routes'] as $row) {
                        fputcsv($handle, [
                            $row['from_department'],
                            $row['from_service'],
                            $row['to_department'],
                            $row['to_service'],
                            $row['count'],
                        ]);
                    }
                    break;

                case 'summary':
                default:
                    $summary = $this->analyticsService->getSummary($filters);
                    fputcsv($handle, ['Metric', 'Value']);
                    fputcsv($handle, ['Total Tickets', $summary['total_tickets']]);
                    fputcsv($handle, ['Completed', $summary['total_completed']]);
                    fputcsv($handle, ['Waiting', $summary['total_waiting']]);
                    fputcsv($handle, ['Serving', $summary['total_serving']]);
                    fputcsv($handle, ['Called', $summary['total_called']]);
                    fputcsv($handle, ['Skipped', $summary['total_skipped']]);
                    fputcsv($handle, ['Cancelled', $summary['total_cancelled']]);
                    fputcsv($handle, ['Transferred', $summary['total_transferred']]);
                    fputcsv($handle, ['Completion Rate', $summary['completion_rate'].'%']);
                    fputcsv($handle, ['Skip Rate', $summary['skip_rate'].'%']);
                    fputcsv($handle, ['Avg Wait Time (mins)', round($summary['avg_wait_seconds'] / 60, 1)]);
                    fputcsv($handle, ['Median Wait Time (mins)', round($summary['median_wait_seconds'] / 60, 1)]);
                    fputcsv($handle, ['90th Percentile Wait Time (mins)', round($summary['p90_wait_seconds'] / 60, 1)]);
                    fputcsv($handle, ['Avg Service Time (mins)', round($summary['avg_service_seconds'] / 60, 1)]);
                    fputcsv($handle, ['Median Service Time (mins)', round($summary['median_service_seconds'] / 60, 1)]);
                    fputcsv($handle, ['Peak Hour', $summary['peak_hour']]);
                    fputcsv($handle, ['Busiest Department', $summary['busiest_department']]);
                    fputcsv($handle, ['Busiest Service', $summary['busiest_service']]);
                    fputcsv($handle, ['Busiest Window', $summary['busiest_window']]);
                    break;
            }

            fclose($handle);
        }, 200, $headers);
    }
}

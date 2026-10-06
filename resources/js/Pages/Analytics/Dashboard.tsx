import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import VolumeChart from '@/Components/Charts/VolumeChart';
import HourlyTrafficChart from '@/Components/Charts/HourlyTrafficChart';
import StatusDonutChart from '@/Components/Charts/StatusDonutChart';
import WaitTimeHistogram from '@/Components/Charts/WaitTimeHistogram';
import PriorityBarChart from '@/Components/Charts/PriorityBarChart';
import SlaComplianceCard from '@/Components/Charts/SlaComplianceCard';
import { Download, Printer, Filter, RefreshCw, Calendar, ArrowRight, TrendingUp, Clock, CheckCircle, AlertTriangle, XCircle, ArrowRightLeft } from 'lucide-react';

interface SummaryData {
    total_tickets: number;
    total_completed: number;
    total_waiting: number;
    total_serving: number;
    total_called: number;
    total_skipped: number;
    total_cancelled: number;
    total_transferred: number;
    total_held: number;
    completion_rate: number;
    skip_rate: number;
    cancellation_rate: number;
    avg_wait_seconds: number;
    min_wait_seconds: number;
    max_wait_seconds: number;
    median_wait_seconds: number;
    p90_wait_seconds: number;
    avg_service_seconds: number;
    min_service_seconds: number;
    max_service_seconds: number;
    median_service_seconds: number;
    p90_service_seconds: number;
    avg_total_seconds: number;
    max_total_seconds: number;
    peak_hour: string;
    busiest_department: string;
    busiest_service: string;
    busiest_window: string;
}

interface FilterState {
    start_date: string;
    end_date: string;
    preset: string;
    department_id: number | null;
    service_id: number | null;
    window_id: number | null;
    priority_type: string | null;
    status: string | null;
    group_by: string;
}

interface OptionItem {
    id: number;
    name: string;
    code?: string;
    department_id?: number;
    window_number?: number;
}

interface AnalyticsDashboardProps extends PageProps {
    filters: FilterState;
    options: {
        departments: OptionItem[];
        services: OptionItem[];
        windows: OptionItem[];
    };
    summary: SummaryData;
    volume: any[];
    hourly: any;
    waitTimeDistribution: any[];
    statusBreakdown: any[];
    priorityAnalytics: any[];
    departmentPerformance: any[];
    servicePerformance: any[];
    windowPerformance: any[];
    slaCompliance: any[];
    transfers: {
        total_transfers: number;
        routes: any[];
    };
    canExport: boolean;
    canViewHospitalWide: boolean;
}

export default function Dashboard({
    auth,
    filters,
    options,
    summary,
    volume,
    hourly,
    waitTimeDistribution,
    statusBreakdown,
    priorityAnalytics,
    departmentPerformance,
    servicePerformance,
    windowPerformance,
    slaCompliance,
    transfers,
    canExport,
}: AnalyticsDashboardProps) {
    const [filterValues, setFilterValues] = useState<FilterState>({
        ...filters,
    });

    const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'services' | 'windows' | 'transfers' | 'sla'>('overview');

    const handlePresetChange = (preset: string) => {
        const newFilters = { ...filterValues, preset };
        setFilterValues(newFilters);
        router.get(route('analytics.dashboard'), newFilters as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleApplyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('analytics.dashboard'), filterValues as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleResetFilters = () => {
        const defaultFilters: FilterState = {
            start_date: '',
            end_date: '',
            preset: 'today',
            department_id: null,
            service_id: null,
            window_id: null,
            priority_type: null,
            status: null,
            group_by: 'day',
        };
        setFilterValues(defaultFilters);
        router.get(route('analytics.dashboard'), defaultFilters as any);
    };

    const handleExportCsv = (reportType: string = 'summary') => {
        const queryParams = new URLSearchParams({
            ...filterValues as any,
            report_type: reportType,
            format: 'csv',
        }).toString();

        window.open(route('analytics.export') + '?' + queryParams, '_blank');
    };

    const handleExportPdf = (reportType: string = 'summary') => {
        const queryParams = new URLSearchParams({
            ...filterValues as any,
            report_type: reportType,
            format: 'pdf',
        }).toString();

        window.open(route('analytics.export') + '?' + queryParams, '_blank');
    };

    const formatMinutes = (sec: number) => {
        if (!sec || sec <= 0) return '0 min';
        const mins = Math.round(sec / 60);
        return `${mins} min`;
    };

    // Filter services according to selected department
    const availableServices = filterValues.department_id
        ? options.services.filter((s) => s.department_id === Number(filterValues.department_id))
        : options.services;

    return (
        <AuthenticatedLayout>
            <Head title="Hospital Queue Reports & Analytics" />

            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 font-sans">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                                MedQueue Insights
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                Period: <strong className="text-slate-700 dark:text-slate-300">{filters.start_date}</strong> to <strong className="text-slate-700 dark:text-slate-300">{filters.end_date}</strong>
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            Hospital Queue Reports & Analytics
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Operational performance, patient wait benchmarks, service durations, and SLA compliance.
                        </p>
                    </div>

                    {canExport && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleExportPdf('summary')}
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition shadow-sm"
                            >
                                <Printer className="w-4 h-4 text-slate-500" />
                                Print / PDF Report
                            </button>
                            <button
                                onClick={() => handleExportCsv('summary')}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/30 transition"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* Filter Controls Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-teal-600" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Reporting Period Presets
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'custom'].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handlePresetChange(p)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                                        filterValues.preset === p
                                            ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {p.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                        {filterValues.preset === 'custom' && (
                            <>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={filterValues.start_date}
                                        onChange={(e) => setFilterValues({ ...filterValues, start_date: e.target.value })}
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={filterValues.end_date}
                                        onChange={(e) => setFilterValues({ ...filterValues, end_date: e.target.value })}
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Department</label>
                            <select
                                value={filterValues.department_id || ''}
                                onChange={(e) => setFilterValues({ ...filterValues, department_id: e.target.value ? Number(e.target.value) : null, service_id: null })}
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Departments</option>
                                {options.departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Clinical Service</label>
                            <select
                                value={filterValues.service_id || ''}
                                onChange={(e) => setFilterValues({ ...filterValues, service_id: e.target.value ? Number(e.target.value) : null })}
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Services</option>
                                {availableServices.map((srv) => (
                                    <option key={srv.id} value={srv.id}>{srv.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Window / Station</label>
                            <select
                                value={filterValues.window_id || ''}
                                onChange={(e) => setFilterValues({ ...filterValues, window_id: e.target.value ? Number(e.target.value) : null })}
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Windows</option>
                                {options.windows.map((win) => (
                                    <option key={win.id} value={win.id}>Window {win.window_number} - {win.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Priority Class</label>
                            <select
                                value={filterValues.priority_type || ''}
                                onChange={(e) => setFilterValues({ ...filterValues, priority_type: e.target.value || null })}
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-900 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Priorities</option>
                                <option value="regular">Regular</option>
                                <option value="senior">Senior Citizen</option>
                                <option value="pwd">PWD</option>
                                <option value="pregnant">Pregnant</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 dark:bg-teal-600 hover:bg-slate-700 dark:hover:bg-teal-500 transition shadow-sm"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Filter
                            </button>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                title="Reset Filters"
                                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Primary KPI Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tickets</span>
                            <TrendingUp className="w-4 h-4 text-teal-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary.total_tickets}</div>
                        <div className="text-[11px] text-slate-500">Issued during period</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</span>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.total_completed}</div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">{summary.completion_rate}% Completion Rate</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Wait Time</span>
                            <Clock className="w-4 h-4 text-teal-500" />
                        </div>
                        <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
                            {formatMinutes(summary.avg_wait_seconds)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Median: <strong className="text-slate-700 dark:text-slate-300">{formatMinutes(summary.median_wait_seconds)}</strong>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Service Time</span>
                            <Clock className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {formatMinutes(summary.avg_service_seconds)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Median: <strong className="text-slate-700 dark:text-slate-300">{formatMinutes(summary.median_service_seconds)}</strong>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skipped / No Show</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.total_skipped}</div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">{summary.skip_rate}% Skip Rate</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cancelled / Transfer</span>
                            <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {summary.total_transferred} <span className="text-sm font-normal text-slate-400">/ {summary.total_cancelled}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{summary.cancellation_rate}% Cancelled</div>
                    </div>
                </div>

                {/* Secondary Operational Insights Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-sm text-xs">
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Peak Operational Hour</span>
                        <span className="font-bold text-teal-400 text-sm">{summary.peak_hour}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Busiest Department</span>
                        <span className="font-bold text-slate-100 text-sm">{summary.busiest_department}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Busiest Clinical Service</span>
                        <span className="font-bold text-slate-100 text-sm">{summary.busiest_service}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Busiest Window Counter</span>
                        <span className="font-bold text-slate-100 text-sm">{summary.busiest_window}</span>
                    </div>
                </div>

                {/* Interactive Visual Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <VolumeChart data={volume} />
                    <HourlyTrafficChart data={hourly} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <StatusDonutChart data={statusBreakdown} />
                    <WaitTimeHistogram data={waitTimeDistribution} />
                    <PriorityBarChart data={priorityAnalytics} />
                </div>

                {/* Tabbed Detailed Performance Tables */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 dark:border-slate-700 px-6 pt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-4">
                            {[
                                { key: 'overview', label: 'Department Performance' },
                                { key: 'services', label: 'Service Breakdown' },
                                { key: 'windows', label: 'Window Performance' },
                                { key: 'transfers', label: `Transfers (${transfers.total_transfers})` },
                                { key: 'sla', label: 'SLA Compliance' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                        activeTab === tab.key
                                            ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {canExport && (
                            <button
                                onClick={() => handleExportCsv(activeTab === 'overview' ? 'department_performance' : activeTab === 'services' ? 'service_performance' : activeTab === 'windows' ? 'window_performance' : activeTab === 'transfers' ? 'transfers' : 'sla_compliance')}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 pb-4"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export Table (CSV)
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {/* Department Performance Tab */}
                        {activeTab === 'overview' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                                            <th className="pb-3">Department</th>
                                            <th className="pb-3 text-right">Total Tickets</th>
                                            <th className="pb-3 text-right">Completed</th>
                                            <th className="pb-3 text-right">Skipped</th>
                                            <th className="pb-3 text-right">Transferred</th>
                                            <th className="pb-3 text-right">Avg Wait</th>
                                            <th className="pb-3 text-right">Avg Service</th>
                                            <th className="pb-3 text-right">Completion Rate</th>
                                            <th className="pb-3 text-right">Drill-Down</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {departmentPerformance.map((dept) => (
                                            <tr key={dept.department_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                                                <td className="py-3.5 font-bold text-slate-900 dark:text-slate-100">
                                                    {dept.name} <span className="text-slate-400 font-normal">({dept.code})</span>
                                                </td>
                                                <td className="py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                                                    {dept.total_tickets}
                                                </td>
                                                <td className="py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    {dept.completed}
                                                </td>
                                                <td className="py-3.5 text-right text-amber-600 dark:text-amber-400">
                                                    {dept.skipped}
                                                </td>
                                                <td className="py-3.5 text-right text-purple-600 dark:text-purple-400">
                                                    {dept.transferred}
                                                </td>
                                                <td className="py-3.5 text-right text-slate-600 dark:text-slate-300">
                                                    {formatMinutes(dept.avg_wait_seconds)}
                                                </td>
                                                <td className="py-3.5 text-right text-slate-600 dark:text-slate-300">
                                                    {formatMinutes(dept.avg_service_seconds)}
                                                </td>
                                                <td className="py-3.5 text-right">
                                                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                        {dept.completion_rate}%
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-right">
                                                    <Link
                                                        href={route('analytics.department', dept.department_id)}
                                                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold"
                                                    >
                                                        Details <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Service Performance Tab */}
                        {activeTab === 'services' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                                            <th className="pb-3">Clinical Service</th>
                                            <th className="pb-3">Department</th>
                                            <th className="pb-3 text-right">Tickets</th>
                                            <th className="pb-3 text-right">Completed</th>
                                            <th className="pb-3 text-right">Avg Wait</th>
                                            <th className="pb-3 text-right">Avg Service</th>
                                            <th className="pb-3 text-right">Skip Rate</th>
                                            <th className="pb-3 text-right">Target Wait</th>
                                            <th className="pb-3 text-right">Drill-Down</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {servicePerformance.map((srv) => (
                                            <tr key={srv.service_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                                                <td className="py-3.5 font-bold text-slate-900 dark:text-slate-100">
                                                    {srv.name} <span className="text-slate-400 font-normal">({srv.prefix})</span>
                                                </td>
                                                <td className="py-3.5 text-slate-500">{srv.department_name}</td>
                                                <td className="py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                                                    {srv.total_tickets}
                                                </td>
                                                <td className="py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    {srv.completed}
                                                </td>
                                                <td className="py-3.5 text-right text-slate-600 dark:text-slate-300">
                                                    {formatMinutes(srv.avg_wait_seconds)}
                                                </td>
                                                <td className="py-3.5 text-right text-slate-600 dark:text-slate-300">
                                                    {formatMinutes(srv.avg_service_seconds)}
                                                </td>
                                                <td className="py-3.5 text-right text-amber-600 dark:text-amber-400">
                                                    {srv.skip_rate}%
                                                </td>
                                                <td className="py-3.5 text-right font-semibold text-teal-600 dark:text-teal-400">
                                                    {srv.target_wait_time_minutes ? `${srv.target_wait_time_minutes} min` : '—'}
                                                </td>
                                                <td className="py-3.5 text-right">
                                                    <Link
                                                        href={route('analytics.service', srv.service_id)}
                                                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold"
                                                    >
                                                        Details <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Window Performance Tab */}
                        {activeTab === 'windows' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                                            <th className="pb-3">Window Station</th>
                                            <th className="pb-3">Department</th>
                                            <th className="pb-3">Duty Staff</th>
                                            <th className="pb-3 text-right">Tickets Served</th>
                                            <th className="pb-3 text-right">Completed</th>
                                            <th className="pb-3 text-right">Avg Wait</th>
                                            <th className="pb-3 text-right">Avg Service</th>
                                            <th className="pb-3 text-right">Completion Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {windowPerformance.map((win) => (
                                            <tr key={win.window_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                                                <td className="py-3.5 font-bold text-slate-900 dark:text-slate-100">
                                                    Window {win.window_number} - {win.name}
                                                </td>
                                                <td className="py-3.5 text-slate-500">{win.department_name}</td>
                                                <td className="py-3.5 text-slate-700 dark:text-slate-300 font-medium">{win.assigned_staff}</td>
                                                <td className="py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                                                    {win.tickets_served}
                                                </td>
                                                <td className="py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    {win.completed}
                                                </td>
                                                <td className="py-3.5 text-right text-slate-600 dark:text-slate-300">
                                                    {formatMinutes(win.avg_wait_seconds)}
                                                </td>
                                                <td className="py-3.5 text-right text-slate-600 dark:text-slate-300">
                                                    {formatMinutes(win.avg_service_seconds)}
                                                </td>
                                                <td className="py-3.5 text-right">
                                                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                        {win.completion_rate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Transfers Tab */}
                        {activeTab === 'transfers' && (
                            <div className="space-y-4">
                                <div className="text-xs text-slate-500">
                                    Total patient re-routes & transfers between clinical departments: <strong className="text-slate-800 dark:text-slate-200">{transfers.total_transfers}</strong>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                                                <th className="pb-3">Transfer Route</th>
                                                <th className="pb-3">Origin</th>
                                                <th className="pb-3">Destination</th>
                                                <th className="pb-3 text-right">Transfer Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                            {transfers.routes.map((route, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                                                    <td className="py-3.5 font-bold text-teal-600 dark:text-teal-400">
                                                        {route.route_label}
                                                    </td>
                                                    <td className="py-3.5 text-slate-600 dark:text-slate-300">
                                                        {route.from_department} ({route.from_service})
                                                    </td>
                                                    <td className="py-3.5 text-slate-600 dark:text-slate-300">
                                                        {route.to_department} ({route.to_service})
                                                    </td>
                                                    <td className="py-3.5 text-right font-black text-slate-900 dark:text-slate-100">
                                                        {route.count}
                                                    </td>
                                                </tr>
                                            ))}
                                            {transfers.routes.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-slate-400">
                                                        No inter-department queue transfers recorded for this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SLA Compliance Tab */}
                        {activeTab === 'sla' && (
                            <SlaComplianceCard data={slaCompliance} />
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

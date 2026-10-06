import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import VolumeChart from '@/Components/Charts/VolumeChart';
import HourlyTrafficChart from '@/Components/Charts/HourlyTrafficChart';
import StatusDonutChart from '@/Components/Charts/StatusDonutChart';
import WaitTimeHistogram from '@/Components/Charts/WaitTimeHistogram';
import PriorityBarChart from '@/Components/Charts/PriorityBarChart';
import { ArrowLeft, Clock, CheckCircle, TrendingUp } from 'lucide-react';

interface ServiceDrillDownProps extends PageProps {
    selectedService: {
        id: number;
        code: string;
        name: string;
        prefix: string;
        target_wait_time_minutes: number | null;
        target_service_time_minutes: number | null;
        department?: {
            id: number;
            name: string;
        };
    };
    filters: any;
    summary: any;
    volume: any[];
    hourly: any;
    waitTimeDistribution: any[];
    statusBreakdown: any[];
    priorityAnalytics: any[];
    windowPerformance: any[];
}

export default function ServiceDrillDown({
    selectedService,
    filters,
    summary,
    volume,
    hourly,
    waitTimeDistribution,
    statusBreakdown,
    priorityAnalytics,
    windowPerformance,
}: ServiceDrillDownProps) {
    const formatMinutes = (sec: number) => {
        if (!sec || sec <= 0) return '0 min';
        return `${Math.round(sec / 60)} min`;
    };

    return (
        <AuthenticatedLayout>
            <Head title={`${selectedService.name} — Service Analytics`} />

            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 font-sans">
                {/* Back Button & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Link
                            href={route('analytics.dashboard')}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                    {selectedService.prefix} ({selectedService.code})
                                </span>
                                <span className="text-xs text-slate-400">
                                    Dept: <strong className="text-slate-700 dark:text-slate-300">{selectedService.department?.name}</strong> | Period: {filters.start_date} to {filters.end_date}
                                </span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                {selectedService.name} — Service Performance
                            </h1>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tickets</span>
                            <TrendingUp className="w-4 h-4 text-teal-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary.total_tickets}</div>
                        <div className="text-[11px] text-slate-500">Service total</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</span>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.total_completed}</div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">{summary.completion_rate}% Completion</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Wait Time</span>
                            <Clock className="w-4 h-4 text-teal-500" />
                        </div>
                        <div className="text-2xl font-black text-teal-600 dark:text-teal-400">{formatMinutes(summary.avg_wait_seconds)}</div>
                        <div className="text-[11px] text-slate-500">Target: {selectedService.target_wait_time_minutes ? `${selectedService.target_wait_time_minutes} min` : 'Not Configured'}</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Service Time</span>
                            <Clock className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatMinutes(summary.avg_service_seconds)}</div>
                        <div className="text-[11px] text-slate-500">Target: {selectedService.target_service_time_minutes ? `${selectedService.target_service_time_minutes} min` : 'Not Configured'}</div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <VolumeChart data={volume} title={`${selectedService.name} Volume`} />
                    <HourlyTrafficChart data={hourly} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <StatusDonutChart data={statusBreakdown} />
                    <WaitTimeHistogram data={waitTimeDistribution} />
                    <PriorityBarChart data={priorityAnalytics} />
                </div>

                {/* Window Performance for this service */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Window Stations Serving This Service</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                                    <th className="pb-3">Station</th>
                                    <th className="pb-3">Assigned Staff</th>
                                    <th className="pb-3 text-right">Tickets Served</th>
                                    <th className="pb-3 text-right">Completed</th>
                                    <th className="pb-3 text-right">Avg Wait</th>
                                    <th className="pb-3 text-right">Avg Service</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {windowPerformance.map((win) => (
                                    <tr key={win.window_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                                        <td className="py-3.5 font-bold text-slate-900 dark:text-slate-100">
                                            Window {win.window_number} - {win.name}
                                        </td>
                                        <td className="py-3.5 text-slate-600 dark:text-slate-300">{win.assigned_staff}</td>
                                        <td className="py-3.5 text-right font-semibold">{win.tickets_served}</td>
                                        <td className="py-3.5 text-right text-emerald-600 dark:text-emerald-400">{win.completed}</td>
                                        <td className="py-3.5 text-right">{formatMinutes(win.avg_wait_seconds)}</td>
                                        <td className="py-3.5 text-right">{formatMinutes(win.avg_service_seconds)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

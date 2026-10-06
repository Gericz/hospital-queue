import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { initEcho, ReverbConfig } from '@/lib/echo';

interface MetricsSummary {
    waiting: number;
    called: number;
    serving: number;
    completed: number;
    skipped: number;
    hold: number;
    transferred: number;
    cancelled: number;
    total_tickets: number;
}

interface Metrics {
    date: string;
    summary: MetricsSummary;
    priorities: Record<string, number>;
    windows: {
        total: number;
        open: number;
        paused: number;
        closed: number;
    };
    staff: {
        active_on_duty: number;
    };
    facilities: {
        operating_departments: number;
        operating_services: number;
    };
}

interface WindowBoardItem {
    id: number;
    window_number: number;
    name: string;
    display_name: string | null;
    status: 'open' | 'closed' | 'paused' | 'offline';
    status_label: string;
    status_badge: string;
    is_active: boolean;
    last_activity_at: string | null;
    department: {
        id: number;
        code: string;
        name: string;
        status: string;
    } | null;
    service: {
        id: number;
        code: string;
        name: string;
        prefix: string;
        status: string;
    } | null;
    assigned_staff: {
        id: number;
        name: string;
        email: string;
        role: string;
        assigned_at: string;
    } | null;
    current_queue: {
        id: number;
        queue_number: string;
        display_number: string;
        status: string;
        status_label: string;
        priority_type: string;
        called_at: string | null;
        started_at: string | null;
        service_name: string;
    } | null;
    waiting_count: number;
}

interface DepartmentItem {
    id: number;
    code: string;
    name: string;
    status: string;
    services?: Array<{ id: number; name: string }>;
}

interface Props extends PageProps {
    metrics: Metrics;
    board: WindowBoardItem[];
    departments: DepartmentItem[];
    filters: {
        date?: string;
        department_id?: number | null;
    };
    reverbConfig?: ReverbConfig;
}

export default function OperationsDashboard({
    auth,
    metrics: initialMetrics,
    board: initialBoard,
    departments,
    filters,
    reverbConfig,
}: Props) {
    const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
    const [board, setBoard] = useState<WindowBoardItem[]>(initialBoard);
    const [selectedDept, setSelectedDept] = useState<string>(filters.department_id ? String(filters.department_id) : '');
    const [selectedDate, setSelectedDate] = useState<string>(filters.date || new Date().toISOString().split('T')[0]);
    const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

    useEffect(() => {
        setMetrics(initialMetrics);
    }, [initialMetrics]);

    useEffect(() => {
        setBoard(initialBoard);
    }, [initialBoard]);

    const handleFilterChange = (deptId: string, date: string) => {
        setSelectedDept(deptId);
        setSelectedDate(date);

        router.get(
            route('operations.dashboard'),
            {
                department_id: deptId ? Number(deptId) : undefined,
                date: date || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const refreshData = useCallback(() => {
        router.reload({
            only: ['metrics', 'board'],
            onSuccess: () => {
                setLastSyncTime(new Date());
                setIsLiveConnected(true);
            },
        });
    }, []);

    // Smart Real-Time Auto-Sync Polling
    useEffect(() => {
        setIsLiveConnected(true);

        let pollTimer: NodeJS.Timeout;

        const startPolling = () => {
            clearInterval(pollTimer);
            const intervalTime = document.hidden ? 10000 : 4000;
            pollTimer = setInterval(refreshData, intervalTime);
        };

        startPolling();

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshData();
            }
            startPolling();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshData]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Hospital Operations & Control Center
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Real-time hospital-wide patient flow, counter status, and operational monitoring.
                        </p>
                    </div>

                    {/* Operational Quick Nav Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('operations.windows')}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                            <svg className="w-4 h-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                            </svg>
                            Windows & Staff
                        </Link>
                        <Link
                            href={route('operations.queues')}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                            <svg className="w-4 h-4 mr-1.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Queue Control
                        </Link>
                        <Link
                            href={route('operations.services')}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                            <svg className="w-4 h-4 mr-1.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Hours & Availability
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Hospital Operations & Queue Control" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Status Bar & Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            <label htmlFor="dept-filter" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Department
                            </label>
                            <select
                                id="dept-filter"
                                value={selectedDept}
                                onChange={(e) => handleFilterChange(e.target.value, selectedDate)}
                                className="text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 px-3 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Departments</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} ({d.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="date-filter" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Date
                            </label>
                            <input
                                id="date-filter"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleFilterChange(selectedDept, e.target.value)}
                                className="text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 px-3 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                            <span>{isLiveConnected ? 'Live Synchronized' : 'Connecting...'}</span>
                        </div>
                        <button
                            onClick={refreshData}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Refresh Data"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">Waiting</div>
                        <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">{metrics.summary.waiting}</div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-blue-700 dark:text-blue-400">Called</div>
                        <div className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1">{metrics.summary.called}</div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400">Serving</div>
                        <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{metrics.summary.serving}</div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">Completed</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{metrics.summary.completed}</div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-orange-700 dark:text-orange-400">Skipped</div>
                        <div className="text-2xl font-black text-orange-900 dark:text-orange-200 mt-1">{metrics.summary.skipped}</div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-purple-700 dark:text-purple-400">On Hold</div>
                        <div className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-1">{metrics.summary.hold}</div>
                    </div>

                    <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-cyan-700 dark:text-cyan-400">Transferred</div>
                        <div className="text-2xl font-black text-cyan-900 dark:text-cyan-200 mt-1">{metrics.summary.transferred}</div>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-rose-700 dark:text-rose-400">Cancelled</div>
                        <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">{metrics.summary.cancelled}</div>
                    </div>
                </div>

                {/* Operations Facility Status Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Window Status Overview */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Window Status</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900 text-center">
                                <span className="block text-xl font-bold text-emerald-700 dark:text-emerald-400">{metrics.windows.open}</span>
                                <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Open</span>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900 text-center">
                                <span className="block text-xl font-bold text-amber-700 dark:text-amber-400">{metrics.windows.paused}</span>
                                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Paused</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                <span className="block text-xl font-bold text-slate-700 dark:text-slate-400">{metrics.windows.closed}</span>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Closed</span>
                            </div>
                        </div>
                    </div>

                    {/* Staff on Duty */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Staffing & Personnel</h3>
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900">
                            <div>
                                <span className="text-xs font-medium text-blue-900 dark:text-blue-300 block">Active Staff at Windows</span>
                                <span className="text-xs text-blue-700 dark:text-blue-400">Serving active hospital stations</span>
                            </div>
                            <span className="text-2xl font-black text-blue-800 dark:text-blue-200">{metrics.staff.active_on_duty}</span>
                        </div>
                    </div>

                    {/* Operating Units */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Facility Availability</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                <span className="block text-lg font-bold text-slate-900 dark:text-white">{metrics.facilities.operating_departments}</span>
                                <span className="text-[11px] text-slate-500">Depts Operating</span>
                            </div>
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                <span className="block text-lg font-bold text-slate-900 dark:text-white">{metrics.facilities.operating_services}</span>
                                <span className="text-[11px] text-slate-500">Services Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real-Time Operations Board */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500" />
                                Real-Time Operations Board
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Live status of all hospital windows, active counters, assigned personnel, and active tickets.
                            </p>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            Synced at {lastSyncTime.toLocaleTimeString()}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4">Window / Counter</th>
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4">Assigned Service</th>
                                    <th className="py-3 px-4">Assigned Staff</th>
                                    <th className="py-3 px-4 text-center">Current Ticket</th>
                                    <th className="py-3 px-4 text-center">Waiting in Queue</th>
                                    <th className="py-3 px-4 text-center">Operational Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {board.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No windows found matching the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    board.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                        W{item.window_number}
                                                    </span>
                                                    <div>
                                                        <div>{item.name}</div>
                                                        {item.display_name && (
                                                            <div className="text-[10px] text-slate-400 font-normal">{item.display_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                {item.department?.name || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                {item.service ? (
                                                    <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                                                        <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                                                            {item.service.prefix}
                                                        </span>
                                                        {item.service.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {item.assigned_staff ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                                                            {item.assigned_staff.name.charAt(0)}
                                                        </span>
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.assigned_staff.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">No Staff Assigned</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {item.current_queue ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-mono font-bold text-sm bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        {item.current_queue.display_number || item.current_queue.queue_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-6 px-2 py-0.5 rounded-full text-xs font-bold ${item.waiting_count > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                                    {item.waiting_count}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${item.status_badge}`}>
                                                    {item.status_label}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

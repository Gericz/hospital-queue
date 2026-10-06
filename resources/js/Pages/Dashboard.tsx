import React, { useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DashboardMetrics, PageProps } from '@/types';
import StatusBadge from '@/Components/StatusBadge';

interface DashboardProps extends PageProps {
    metrics: DashboardMetrics;
}

export default function Dashboard({ metrics, auth }: DashboardProps) {
    const { counts, departments_summary, system_status } = metrics;

    // Smart Auto-Sync Polling for Live Dashboard Metrics
    useEffect(() => {
        let timer: NodeJS.Timeout;

        const performPoll = () => {
            router.reload({
                only: ['metrics'],
            });
        };

        const startPolling = () => {
            clearInterval(timer);
            const intervalTime = document.hidden ? 15000 : 5000;
            timer = setInterval(performPoll, intervalTime);
        };

        startPolling();

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                performPoll();
            }
            startPolling();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                            Hospital Administration Dashboard
                        </h2>
                        <p className="text-xs text-slate-500">
                            System status, master data overview, and operational controls
                        </p>
                    </div>

                    <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-slate-700 dark:text-slate-200 font-medium">● Live (Auto-Sync)</span>
                    </div>
                </div>
            }
        >
            <Head title="Admin Dashboard - MedQueue" />

            <div className="space-y-8">
                {/* Hero Header Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10">
                    <div className="relative z-10 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Step 1 Foundation Initialized
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            MEDQUEUE
                        </h1>
                        <p className="text-base sm:text-lg font-medium text-teal-100 mt-1">
                            Hospital Queue & Patient Flow Management System
                        </p>
                        <p className="text-xs sm:text-sm text-teal-200/80 mt-2 max-w-2xl leading-relaxed">
                            Welcome back, <strong className="text-white">{auth.user.name}</strong> ({auth.user.role}).
                            The local hospital instance is configured and ready for clinical queue orchestration.
                        </p>
                    </div>

                    {/* Background Decorative Pattern */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
                        <svg className="w-80 h-80 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                </div>

                {/* Primary Metric Grid (Requirement 5) */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        System Overview & Resource Counts
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Departments */}
                        <Link
                            href={route('departments.index')}
                            className="group block bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-500/40 transition duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                    {counts.active_departments} Active
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Departments</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{counts.departments}</p>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-600 group-hover:translate-x-0.5 transition">
                                Manage Departments <span>→</span>
                            </div>
                        </Link>

                        {/* Services */}
                        <Link
                            href={route('services.index')}
                            className="group block bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-500/40 transition duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                    {counts.active_services} Active
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Services</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{counts.services}</p>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-cyan-600 group-hover:translate-x-0.5 transition">
                                Manage Services <span>→</span>
                            </div>
                        </Link>

                        {/* Windows */}
                        <Link
                            href={route('windows.index')}
                            className="group block bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-500/40 transition duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                    {counts.active_windows} Active
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Windows / Counters</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{counts.windows}</p>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition">
                                Manage Windows <span>→</span>
                            </div>
                        </Link>

                        {/* Active Users */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                    {counts.total_users} Total
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Users</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{counts.active_users}</p>
                            </div>
                            <p className="mt-3 text-xs text-slate-500 font-medium">Role-based Access Active</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Requirement 5) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Queue & Master Data Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Link
                            href={route('queue.tickets.create')}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-50 hover:bg-teal-100 hover:text-teal-900 text-teal-800 text-sm font-bold border border-teal-200 transition shadow-xs"
                        >
                            <span>🎟️</span>
                            <span>Issue Ticket</span>
                        </Link>

                        <a
                            href="/kiosk"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 hover:text-blue-900 text-blue-800 text-sm font-bold border border-blue-200 transition shadow-xs"
                        >
                            <span>📱</span>
                            <span>Patient Kiosk ↗</span>
                        </a>

                        <Link
                            href={route('queue.terminal')}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 text-emerald-800 text-sm font-bold border border-emerald-200 transition shadow-xs"
                        >
                            <span>👨‍⚕️</span>
                            <span>Staff Terminal</span>
                        </Link>

                        <a
                            href="/queue/display"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold border border-slate-800 transition shadow-xs"
                        >
                            <span>📺</span>
                            <span>TV Display ↗</span>
                        </a>

                        <Link
                            href={route('departments.index')}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-slate-700 text-sm font-bold border border-slate-200 transition"
                        >
                            <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>Departments</span>
                        </Link>

                        <Link
                            href={route('services.index')}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-slate-700 text-sm font-bold border border-slate-200 transition"
                        >
                            <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <span>Services</span>
                        </Link>

                        <Link
                            href={route('windows.index')}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-slate-700 text-sm font-bold border border-slate-200 transition"
                        >
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Windows</span>
                        </Link>

                        <Link
                            href={route('queue.monitor')}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-slate-700 text-sm font-bold border border-slate-200 transition"
                        >
                            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Queue Monitor</span>
                        </Link>
                    </div>
                </div>

                {/* Department Matrix Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Hospital Department Capacity & Structure</h3>
                            <p className="text-xs text-slate-500">Live service offerings and window counters per department</p>
                        </div>
                        <Link
                            href={route('departments.create')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm"
                        >
                            <span>+</span> New Department
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-6">Code</th>
                                    <th className="py-3 px-6">Department Name</th>
                                    <th className="py-3 px-6">Services Configured</th>
                                    <th className="py-3 px-6">Assigned Windows</th>
                                    <th className="py-3 px-6">Status</th>
                                    <th className="py-3 px-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {departments_summary.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-slate-50/70 transition">
                                        <td className="py-3.5 px-6 font-mono font-bold text-teal-700">
                                            {dept.code}
                                        </td>
                                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                                            {dept.name}
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                                                {dept.services_count} Services
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                {dept.windows_count} Counters
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <StatusBadge isActive={dept.is_active} size="sm" />
                                        </td>
                                        <td className="py-3.5 px-6 text-right">
                                            <Link
                                                href={route('departments.show', dept.id)}
                                                className="text-xs font-bold text-teal-600 hover:text-teal-800 transition"
                                            >
                                                View Details →
                                            </Link>
                                        </td>
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


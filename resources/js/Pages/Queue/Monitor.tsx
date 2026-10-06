import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Department, Window, Queue, PageProps } from '@/types';
import { getEcho, QueueBroadcastPayload } from '@/lib/echo';

interface MonitorProps extends PageProps {
    departments: (Department & { windows: Window[]; services: any[] })[];
    selectedDepartment: (Department & { windows: Window[]; services: any[] }) | null;
    activeQueues: Queue[];
    waitingQueues: Queue[];
    holdQueues: Queue[];
    recentCompleted: Queue[];
}

export default function Monitor({
    auth,
    departments,
    selectedDepartment,
    activeQueues: initialActive,
    waitingQueues: initialWaiting,
    holdQueues: initialHold,
    recentCompleted: initialCompleted,
}: MonitorProps) {
    const [activeQueues, setActiveQueues] = useState<Queue[]>(initialActive);
    const [waitingQueues, setWaitingQueues] = useState<Queue[]>(initialWaiting);
    const [holdQueues, setHoldQueues] = useState<Queue[]>(initialHold);
    const [recentCompleted, setRecentCompleted] = useState<Queue[]>(initialCompleted);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

    useEffect(() => {
        setActiveQueues(initialActive);
        setWaitingQueues(initialWaiting);
        setHoldQueues(initialHold);
        setRecentCompleted(initialCompleted);
    }, [initialActive, initialWaiting, initialHold, initialCompleted]);

    const handleDepartmentChange = (deptId: string) => {
        router.get(
            route('queue.monitor'),
            { department_id: deptId },
            { preserveState: false, preserveScroll: true }
        );
    };

    // Smart Real-Time Auto-Sync Polling
    useEffect(() => {
        if (!selectedDepartment) return;

        setConnectionStatus('connected');

        let pollTimer: NodeJS.Timeout;

        const performPoll = () => {
            router.reload({
                only: ['activeQueues', 'waitingQueues', 'holdQueues', 'recentCompleted'],
            });
        };

        const startPolling = () => {
            clearInterval(pollTimer);
            const intervalTime = document.hidden ? 8000 : 3000;
            pollTimer = setInterval(performPoll, intervalTime);
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
            clearInterval(pollTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [selectedDepartment]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">
                            Queue Monitor Dashboard
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Real-time hospital operations & patient flow supervisor monitor
                        </p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <select
                            value={selectedDepartment?.id || ''}
                            onChange={(e) => handleDepartmentChange(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl py-2 px-3 shadow-sm focus:ring-blue-500"
                        >
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name} ({dept.code})
                                </option>
                            ))}
                        </select>

                        {/* Live Auto-Sync Indicator */}
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    connectionStatus === 'connected'
                                        ? 'bg-emerald-500 animate-pulse'
                                        : 'bg-amber-500 animate-ping'
                                }`}
                            />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">
                                {connectionStatus === 'connected' ? '● Live (Auto-Sync)' : '● Syncing...'}
                            </span>
                        </div>

                        {selectedDepartment && (
                            <a
                                href={`/queue/display/${selectedDepartment.code}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                                Open TV View ↗
                            </a>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Queue Monitor — MedQueue" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Active Windows Grid */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 flex items-center justify-between">
                            <span>Currently Active Counters ({activeQueues.length})</span>
                            <span className="text-xs font-normal text-slate-400">Real-time status</span>
                        </h3>

                        {activeQueues.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {activeQueues.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="bg-slate-50 dark:bg-slate-800/60 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 shadow-sm relative overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {ticket.window?.name || `Window #${ticket.window_id}`}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    ticket.status === 'serving'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                                                }`}
                                            >
                                                {ticket.status}
                                            </span>
                                        </div>

                                        <div className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400 my-1">
                                            {ticket.queue_number}
                                        </div>

                                        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                                            {ticket.service?.name}
                                        </div>

                                        {ticket.caller && (
                                            <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                                                <span>Staff: {ticket.caller.name}</span>
                                                {ticket.priority_type !== 'REGULAR' && (
                                                    <span className="text-amber-500 font-bold">
                                                        ⭐ {ticket.priority_type}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-slate-400 text-sm">
                                No counters currently serving patients.
                            </div>
                        )}
                    </div>

                    {/* Lower 2 Cols: Waiting List & Completed List */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Waiting Patients */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4 flex items-center justify-between">
                                <span>Waiting in Queue ({waitingQueues.length})</span>
                                <span className="text-xs font-normal text-slate-400">Priority order</span>
                            </h3>

                            {waitingQueues.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                    {waitingQueues.map((ticket, idx) => (
                                        <div
                                            key={ticket.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                                                    {ticket.queue_number}
                                                </span>
                                                <span className="text-slate-500">{ticket.service?.name}</span>
                                            </div>

                                            {ticket.priority_type !== 'REGULAR' && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                                                    {ticket.priority_type}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-400 text-sm">
                                    No patients currently waiting.
                                </div>
                            )}
                        </div>

                        {/* Recently Completed */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-4 flex items-center justify-between">
                                <span>Recently Completed ({recentCompleted.length})</span>
                                <span className="text-xs font-normal text-slate-400">Last 10 served</span>
                            </h3>

                            {recentCompleted.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                    {recentCompleted.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className="text-emerald-500 font-bold">✓</span>
                                                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                                                    {ticket.queue_number}
                                                </span>
                                                <span className="text-slate-500">{ticket.service?.name}</span>
                                            </div>

                                            <span className="text-slate-400 text-[11px]">
                                                {ticket.window?.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-400 text-sm">
                                    No tickets completed yet today.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}


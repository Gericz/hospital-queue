import React, { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Department, Window, Queue, PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import TicketPrintPreviewModal from '@/Components/Ticket/TicketPrintPreviewModal';
import ThermalTicket from '@/Components/Ticket/ThermalTicket';
import { getEcho, QueueBroadcastPayload } from '@/lib/echo';

interface TodayStats {
    waiting: number;
    serving: number;
    completed: number;
    skipped: number;
    hold: number;
}

interface StaffTerminalProps extends PageProps {
    departments: (Department & { windows: Window[]; services: any[] })[];
    selectedDepartment: (Department & { windows: Window[]; services: any[] }) | null;
    selectedWindow: Window | null;
    currentTicket: Queue | null;
    waitingQueue: Queue[];
    holdQueue: Queue[];
    todayStats: TodayStats;
}

export default function StaffTerminal({
    auth,
    departments,
    selectedDepartment,
    selectedWindow,
    currentTicket: initialCurrentTicket,
    waitingQueue: initialWaitingQueue,
    holdQueue: initialHoldQueue,
    todayStats: initialTodayStats,
}: StaffTerminalProps) {
    const [currentTicket, setCurrentTicket] = useState<Queue | null>(initialCurrentTicket);
    const [waitingQueue, setWaitingQueue] = useState<Queue[]>(initialWaitingQueue);
    const [holdQueue, setHoldQueue] = useState<Queue[]>(initialHoldQueue);
    const [todayStats, setTodayStats] = useState<TodayStats>(initialTodayStats);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

    // Modals state
    const [skipModalOpen, setSkipModalOpen] = useState(false);
    const [skipReason, setSkipReason] = useState('');
    const [holdModalOpen, setHoldModalOpen] = useState(false);
    const [holdReason, setHoldReason] = useState('');
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [transferDeptId, setTransferDeptId] = useState<number | ''>('');
    const [transferServiceId, setTransferServiceId] = useState<number | ''>('');
    const [transferReason, setTransferReason] = useState('');
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Keep local state in sync when Inertia props change
    useEffect(() => {
        setCurrentTicket(initialCurrentTicket);
        setWaitingQueue(initialWaitingQueue);
        setHoldQueue(initialHoldQueue);
        setTodayStats(initialTodayStats);
    }, [initialCurrentTicket, initialWaitingQueue, initialHoldQueue, initialTodayStats]);

    // Handle department & window selector changes
    const handleDepartmentChange = (deptId: string) => {
        router.get(
            route('queue.terminal'),
            { department_id: deptId },
            { preserveState: false, preserveScroll: true }
        );
    };

    const handleWindowChange = (winId: string) => {
        if (!selectedDepartment) return;
        router.get(
            route('queue.terminal'),
            { department_id: selectedDepartment.id, window_id: winId },
            { preserveState: false, preserveScroll: true }
        );
    };

    // Smart Real-Time Auto-Sync Polling (Near-instant updates without WebSockets)
    useEffect(() => {
        if (!selectedDepartment) return;

        setConnectionStatus('connected');

        let pollTimer: NodeJS.Timeout;

        const performPoll = () => {
            // Do not poll if a modal is open or an action is in-flight
            if (skipModalOpen || holdModalOpen || transferModalOpen || isActionLoading) {
                return;
            }

            router.reload({
                only: ['currentTicket', 'waitingQueue', 'holdQueue', 'todayStats'],
            });
        };

        const startPolling = () => {
            clearInterval(pollTimer);
            const intervalTime = document.hidden ? 6000 : 2500;
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
    }, [selectedDepartment, selectedWindow, skipModalOpen, holdModalOpen, transferModalOpen, isActionLoading]);

    // Action Handlers
    const handleCallNext = () => {
        if (!selectedWindow) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.call-next'),
            { window_id: selectedWindow.id },
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const handleRecall = () => {
        if (!currentTicket || !selectedWindow) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.recall', currentTicket.id),
            { window_id: selectedWindow.id },
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const handleStartServing = () => {
        if (!currentTicket || !selectedWindow) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.serve', currentTicket.id),
            { window_id: selectedWindow.id },
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const handleComplete = () => {
        if (!currentTicket || !selectedWindow) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.complete', currentTicket.id),
            { window_id: selectedWindow.id },
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const handleSkipSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTicket) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.skip', currentTicket.id),
            { reason: skipReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSkipModalOpen(false);
                    setSkipReason('');
                },
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const handleHoldSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTicket) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.hold', currentTicket.id),
            { reason: holdReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setHoldModalOpen(false);
                    setHoldReason('');
                },
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const handleResume = (queueId: number) => {
        if (!selectedWindow) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.resume', queueId),
            { window_id: selectedWindow.id },
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTicket || !transferDeptId || !transferServiceId) return;
        setIsActionLoading(true);
        router.post(
            route('queue.terminal.transfer', currentTicket.id),
            {
                target_department_id: transferDeptId,
                target_service_id: transferServiceId,
                reason: transferReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTransferModalOpen(false);
                    setTransferDeptId('');
                    setTransferServiceId('');
                    setTransferReason('');
                },
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const targetDepartment = departments.find((d) => d.id === Number(transferDeptId));
    const targetServices = targetDepartment?.services || [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">
                            Staff Workstation Terminal
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Real-time patient queue calling, serving & counter station management
                        </p>
                    </div>

                    {/* Department & Window Selectors */}
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

                        <select
                            value={selectedWindow?.id || ''}
                            onChange={(e) => handleWindowChange(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl py-2 px-3 shadow-sm focus:ring-blue-500"
                        >
                            <option value="">-- Choose Window --</option>
                            {selectedDepartment?.windows.map((win) => (
                                <option key={win.id} value={win.id}>
                                    {win.name} (Counter #{win.window_number})
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
                    </div>
                </div>
            }
        >
            <Head title="Staff Terminal — MedQueue" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Top Stats Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Waiting
                            </div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                {todayStats.waiting}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                Serving
                            </div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                {todayStats.serving}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Completed
                            </div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                {todayStats.completed}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                On Hold
                            </div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                {todayStats.hold}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Skipped
                            </div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                {todayStats.skipped}
                            </div>
                        </div>
                    </div>

                    {/* Window Selection Prompt if none chosen */}
                    {!selectedWindow && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-6 text-center">
                            <div className="text-3xl mb-2">🪟</div>
                            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">
                                Please Select Your Window Counter Station
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md mx-auto mt-1">
                                Use the dropdown above to bind this terminal to an active counter station before calling next patients.
                            </p>
                        </div>
                    )}

                    {/* Main Workstation Stage */}
                    {selectedWindow && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left 7 Cols: Active Station Card & Control Buttons */}
                            <div className="lg:col-span-7 space-y-6">
                                {/* Currently Called / Serving Ticket Card */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                                {selectedWindow.name}
                                            </span>
                                            {currentTicket && (
                                                <span
                                                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                                                        currentTicket.status === 'serving'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse'
                                                    }`}
                                                >
                                                    ● {currentTicket.status.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400">
                                            Station #{selectedWindow.window_number}
                                        </span>
                                    </div>

                                    {currentTicket ? (
                                        <div className="my-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                            Active Patient Ticket
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPrintModalOpen(true)}
                                                            className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer flex items-center space-x-1"
                                                            title="Preview & Print Ticket Slip"
                                                        >
                                                            <span>👁️</span>
                                                            <span>Print Preview</span>
                                                        </button>
                                                    </div>
                                                    <div className="text-6xl font-black font-mono text-slate-900 dark:text-white tracking-tight mt-1">
                                                        {currentTicket.queue_number}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                        {currentTicket.service?.name}
                                                    </div>
                                                    {currentTicket.priority_type !== 'REGULAR' && (
                                                        <span className="mt-1 inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                            ⭐ {currentTicket.priority_type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {(currentTicket.patient_name || currentTicket.patient_reference) && (
                                                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                                                    <div>
                                                        Patient: <span className="font-bold">{currentTicket.patient_name || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        ID: <span className="font-mono">{currentTicket.patient_reference || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons for Active Ticket */}
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-6">
                                                <button
                                                    onClick={handleRecall}
                                                    disabled={isActionLoading}
                                                    className="px-3 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center justify-center space-x-1.5"
                                                >
                                                    <span>📢</span>
                                                    <span>Recall</span>
                                                </button>

                                                {currentTicket.status === 'called' ? (
                                                    <button
                                                        onClick={handleStartServing}
                                                        disabled={isActionLoading}
                                                        className="px-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
                                                    >
                                                        <span>▶</span>
                                                        <span>Start Serving</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleComplete}
                                                        disabled={isActionLoading}
                                                        className="px-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
                                                    >
                                                        <span>✓</span>
                                                        <span>Complete</span>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setHoldModalOpen(true)}
                                                    disabled={isActionLoading}
                                                    className="px-3 py-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl border border-purple-200 dark:border-purple-800 transition cursor-pointer flex items-center justify-center space-x-1.5"
                                                >
                                                    <span>⏸</span>
                                                    <span>Put On Hold</span>
                                                </button>

                                                <button
                                                    onClick={() => setTransferModalOpen(true)}
                                                    disabled={isActionLoading}
                                                    className="px-3 py-3 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 font-bold text-xs rounded-xl border border-cyan-200 dark:border-cyan-800 transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                                                >
                                                    <span>🔄</span>
                                                    <span>Transfer</span>
                                                </button>

                                                <button
                                                    onClick={() => setSkipModalOpen(true)}
                                                    disabled={isActionLoading}
                                                    className="px-3 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition cursor-pointer flex items-center justify-center space-x-1.5"
                                                >
                                                    <span>⏭</span>
                                                    <span>Skip / No Show</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center">
                                            <div className="text-4xl mb-3">🔔</div>
                                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                                Counter Available
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                                Ready to receive patient. Click below to call the next waiting ticket in priority order.
                                            </p>

                                            <div className="mt-6">
                                                <PrimaryButton
                                                    onClick={handleCallNext}
                                                    disabled={isActionLoading || waitingQueue.length === 0}
                                                    className="py-3.5 px-8 text-sm font-bold shadow-lg shadow-blue-500/20"
                                                >
                                                    {isActionLoading
                                                        ? 'Calling...'
                                                        : waitingQueue.length === 0
                                                        ? 'No Patients Waiting'
                                                        : '📢 Call Next Patient'}
                                                </PrimaryButton>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* On Hold Patient Queue */}
                                {holdQueue.length > 0 && (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-4 flex items-center justify-between">
                                            <span>Patients On Hold</span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                                                {holdQueue.length} On Hold
                                            </span>
                                        </h3>

                                        <div className="space-y-2.5">
                                            {holdQueue.map((ticket) => (
                                                <div
                                                    key={ticket.id}
                                                    className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"
                                                >
                                                    <div>
                                                        <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                                                            {ticket.queue_number}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {ticket.service?.name} {ticket.patient_name ? `• ${ticket.patient_name}` : ''}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleResume(ticket.id)}
                                                        disabled={isActionLoading || !!currentTicket}
                                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                                                        title={currentTicket ? 'Finish current ticket first' : 'Resume patient'}
                                                    >
                                                        Resume ▶
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right 5 Cols: Waiting Queue Panel */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            <span>Waiting Queue ({waitingQueue.length})</span>
                                        </h3>
                                        <span className="text-xs text-slate-400">Next in line</span>
                                    </div>

                                    {waitingQueue.length > 0 ? (
                                        <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-360px)] pr-1">
                                            {waitingQueue.map((ticket, index) => (
                                                <div
                                                    key={ticket.id}
                                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                                                            {index + 1}
                                                        </span>
                                                        <div>
                                                            <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                                                                {ticket.queue_number}
                                                            </div>
                                                            <div className="text-xs text-slate-500 truncate">
                                                                {ticket.service?.name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {ticket.priority_type !== 'REGULAR' && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                            {ticket.priority_type}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center text-slate-400">
                                            <div className="text-3xl mb-2">🎉</div>
                                            <p className="text-sm font-semibold">Queue is clear</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                No patients currently waiting in this department.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Skip Confirmation Modal */}
            <Modal show={skipModalOpen} onClose={() => setSkipModalOpen(false)}>
                <form onSubmit={handleSkipSubmit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Skip Ticket #{currentTicket?.queue_number}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Mark this ticket as skipped / no-show.
                    </p>

                    <div className="mt-4">
                        <InputLabel htmlFor="skipReason" value="Reason for Skipping (Optional)" />
                        <TextInput
                            id="skipReason"
                            value={skipReason}
                            onChange={(e) => setSkipReason(e.target.value)}
                            placeholder="e.g. Patient did not show up after 3 calls"
                            className="mt-1 block w-full text-sm"
                        />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setSkipModalOpen(false)}>Cancel</SecondaryButton>
                        <DangerButton disabled={isActionLoading}>Skip Ticket</DangerButton>
                    </div>
                </form>
            </Modal>

            {/* Hold Confirmation Modal */}
            <Modal show={holdModalOpen} onClose={() => setHoldModalOpen(false)}>
                <form onSubmit={handleHoldSubmit} className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Place Ticket #{currentTicket?.queue_number} on Hold
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Temporarily hold this ticket (e.g. sent for laboratory tests or imaging).
                    </p>

                    <div className="mt-4">
                        <InputLabel htmlFor="holdReason" value="Reason for Hold (Optional)" />
                        <TextInput
                            id="holdReason"
                            value={holdReason}
                            onChange={(e) => setHoldReason(e.target.value)}
                            placeholder="e.g. Sent for X-Ray / blood extraction"
                            className="mt-1 block w-full text-sm"
                        />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setHoldModalOpen(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={isActionLoading}>Place on Hold</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Transfer Modal */}
            <Modal show={transferModalOpen} onClose={() => setTransferModalOpen(false)}>
                <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Transfer Patient #{currentTicket?.queue_number}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Transfer this patient to another hospital department or clinical service. Ticket #{currentTicket?.queue_number} will be retained (no reprint required).
                    </p>

                    <div>
                        <InputLabel htmlFor="transferDeptId" value="Target Department *" />
                        <SelectInput
                            id="transferDeptId"
                            value={transferDeptId}
                            onChange={(e) => {
                                setTransferDeptId(e.target.value ? Number(e.target.value) : '');
                                setTransferServiceId('');
                            }}
                            className="mt-1 block w-full"
                            required
                        >
                            <option value="">-- Choose Target Department --</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.code})
                                </option>
                            ))}
                        </SelectInput>
                    </div>

                    <div>
                        <InputLabel htmlFor="transferServiceId" value="Target Service *" />
                        <SelectInput
                            id="transferServiceId"
                            value={transferServiceId}
                            onChange={(e) => setTransferServiceId(e.target.value ? Number(e.target.value) : '')}
                            className="mt-1 block w-full"
                            required
                        >
                            <option value="">-- Choose Target Service --</option>
                            {targetServices.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.prefix})
                                </option>
                            ))}
                        </SelectInput>
                    </div>

                    <div>
                        <InputLabel htmlFor="transferReason" value="Transfer Notes / Reason" />
                        <TextInput
                            id="transferReason"
                            value={transferReason}
                            onChange={(e) => setTransferReason(e.target.value)}
                            placeholder="e.g. Referred for CBC and Urinalysis"
                            className="mt-1 block w-full text-sm"
                        />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3 pt-2">
                        <SecondaryButton onClick={() => setTransferModalOpen(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={isActionLoading || !transferDeptId || !transferServiceId}>
                            Execute Transfer
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Thermal Ticket Print Preview Modal */}
            <TicketPrintPreviewModal
                show={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                ticket={
                    currentTicket
                        ? {
                              public_token: currentTicket.public_token || '',
                              queue_number: currentTicket.queue_number,
                              display_number: currentTicket.display_number,
                              department_name: currentTicket.department?.name || selectedDepartment?.name,
                              service_name: currentTicket.service?.name,
                              priority_type: currentTicket.priority_type,
                              patient_name: currentTicket.patient_name,
                              patient_reference: currentTicket.patient_reference,
                              created_at: currentTicket.created_at || new Date().toLocaleString(),
                              width: '80mm',
                          }
                        : null
                }
                hospital={{
                    name: 'MedQueue Medical Center',
                    tagline: 'Patient Flow & Queue Management',
                    show_patient_name: true,
                    ticket_width: '80mm',
                }}
                onPrint={() => setPrintModalOpen(false)}
            />

            {/* Print-Only Layout for Terminal Thermal Printer */}
            {currentTicket && (
                <div id="thermal-print-area" className="hidden print:block">
                    <ThermalTicket
                        ticket={{
                            public_token: currentTicket.public_token || '',
                            queue_number: currentTicket.queue_number,
                            display_number: currentTicket.display_number,
                            department_name: currentTicket.department?.name || selectedDepartment?.name,
                            service_name: currentTicket.service?.name,
                            priority_type: currentTicket.priority_type,
                            patient_name: currentTicket.patient_name,
                            patient_reference: currentTicket.patient_reference,
                            created_at: currentTicket.created_at || new Date().toLocaleString(),
                            width: '80mm',
                        }}
                        hospitalName="MedQueue Medical Center"
                        showPatientName={true}
                    />
                </div>
            )}
        </AuthenticatedLayout>
    );
}

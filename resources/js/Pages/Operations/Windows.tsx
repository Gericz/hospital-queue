import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';

interface WindowItem {
    id: number;
    window_number: number;
    name: string;
    display_name: string | null;
    status: 'open' | 'closed' | 'paused' | 'offline';
    status_label: string;
    status_badge: string;
    is_active: boolean;
    department: {
        id: number;
        code: string;
        name: string;
    } | null;
    service: {
        id: number;
        code: string;
        name: string;
        prefix: string;
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
    } | null;
    waiting_count: number;
}

interface StaffUser {
    id: number;
    name: string;
    email: string;
    role: string;
    active_window_assignment?: {
        window?: {
            id: number;
            window_number: number;
            name: string;
        };
    } | null;
}

interface DepartmentOption {
    id: number;
    code: string;
    name: string;
    services: Array<{
        id: number;
        code: string;
        name: string;
        prefix: string;
    }>;
}

interface Props extends PageProps {
    board: WindowItem[];
    departments: DepartmentOption[];
    staffUsers: StaffUser[];
    filters: {
        department_id?: number | null;
    };
    windowStatuses: Array<{
        value: string;
        label: string;
        badge: string;
    }>;
}

export default function OperationsWindows({
    auth,
    board,
    departments,
    staffUsers,
    filters,
    windowStatuses,
}: Props) {
    const [selectedDeptId, setSelectedDeptId] = useState<string>(filters.department_id ? String(filters.department_id) : '');
    const [activeModal, setActiveModal] = useState<'assign' | 'status' | null>(null);
    const [targetWindow, setTargetWindow] = useState<WindowItem | null>(null);

    // Assign Form State
    const [assignUserId, setAssignUserId] = useState<string>('');
    const [assignServiceId, setAssignServiceId] = useState<string>('');
    const [openOnAssign, setOpenOnAssign] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const handleDepartmentFilter = (deptId: string) => {
        setSelectedDeptId(deptId);
        router.get(
            route('operations.windows'),
            { department_id: deptId ? Number(deptId) : undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Auto-sync polling every 4s when no modal is open
    React.useEffect(() => {
        let timer: NodeJS.Timeout;

        const performPoll = () => {
            if (activeModal || isSubmitting) return;
            router.reload({
                only: ['board', 'staffUsers'],
            });
        };

        const startPolling = () => {
            clearInterval(timer);
            const intervalTime = document.hidden ? 10000 : 4000;
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
    }, [activeModal, isSubmitting]);

    const handleStatusChange = (window: WindowItem, newStatus: string) => {
        router.post(
            route('operations.windows.status', window.id),
            { status: newStatus },
            { preserveScroll: true }
        );
    };

    const openAssignModal = (window: WindowItem) => {
        setTargetWindow(window);
        setAssignUserId(window.assigned_staff ? String(window.assigned_staff.id) : '');
        setAssignServiceId(window.service ? String(window.service.id) : '');
        setActiveModal('assign');
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetWindow || !assignUserId) return;

        setIsSubmitting(true);
        router.post(
            route('operations.windows.assign', targetWindow.id),
            {
                user_id: Number(assignUserId),
                service_id: assignServiceId ? Number(assignServiceId) : undefined,
                open_window: openOnAssign,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setActiveModal(null);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const handleUnassign = (window: WindowItem) => {
        if (!confirm(`Are you sure you want to unassign ${window.assigned_staff?.name} from Window #${window.window_number}?`)) {
            return;
        }

        router.post(
            route('operations.windows.unassign', window.id),
            { close_window: true },
            { preserveScroll: true }
        );
    };

    // Find services for target window's department
    const targetDeptServices = targetWindow?.department
        ? departments.find((d) => d.id === targetWindow.department?.id)?.services || []
        : [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                            </svg>
                            Window Stations & Staff Allocation
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Open, close, pause, and dynamically assign medical staff to consultation counters.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={selectedDeptId}
                            onChange={(e) => handleDepartmentFilter(e.target.value)}
                            className="text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 px-3 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.code})
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">● Live (Auto-Sync)</span>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Window Station Operations" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Windows Grid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {board.map((window) => {
                        const isOpen = window.status === 'open';
                        const isPaused = window.status === 'paused';
                        const isClosed = window.status === 'closed' || window.status === 'offline';

                        return (
                            <div
                                key={window.id}
                                className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border transition-all ${
                                    isOpen
                                        ? 'border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-400/20'
                                        : isPaused
                                        ? 'border-amber-300 dark:border-amber-800/80'
                                        : 'border-slate-200 dark:border-slate-700 opacity-90'
                                }`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-sm ${
                                            isOpen
                                                ? 'bg-emerald-600 text-white'
                                                : isPaused
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}>
                                            W{window.window_number}
                                        </span>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                                {window.name}
                                            </h3>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {window.department?.name}
                                            </span>
                                        </div>
                                    </div>

                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${window.status_badge}`}>
                                        {window.status_label}
                                    </span>
                                </div>

                                {/* Assigned Service & Staff Info */}
                                <div className="mt-4 space-y-2 text-xs border-t border-b border-slate-100 dark:border-slate-700/60 py-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Service:</span>
                                        {window.service ? (
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                [{window.service.prefix}] {window.service.name}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic">Unassigned</span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Assigned Staff:</span>
                                        {window.assigned_staff ? (
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {window.assigned_staff.name}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic">None</span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Current Ticket:</span>
                                        {window.current_queue ? (
                                            <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                                                {window.current_queue.display_number || window.current_queue.queue_number}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </div>
                                </div>

                                {/* Operational Action Buttons */}
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                                    {/* Status Controls */}
                                    <div className="flex items-center gap-1.5">
                                        {isOpen && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(window, 'paused')}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                                    title="Pause Window"
                                                >
                                                    Pause
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(window, 'closed')}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                                    title="Close Window"
                                                >
                                                    Close
                                                </button>
                                            </>
                                        )}

                                        {isPaused && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(window, 'open')}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                    title="Resume Window"
                                                >
                                                    Resume
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(window, 'closed')}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                                >
                                                    Close
                                                </button>
                                            </>
                                        )}

                                        {isClosed && (
                                            <button
                                                onClick={() => handleStatusChange(window, 'open')}
                                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                            >
                                                Open Window
                                            </button>
                                        )}
                                    </div>

                                    {/* Staff Allocation Actions */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => openAssignModal(window)}
                                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                                        >
                                            {window.assigned_staff ? 'Reassign' : 'Assign Staff'}
                                        </button>
                                        {window.assigned_staff && (
                                            <button
                                                onClick={() => handleUnassign(window)}
                                                className="px-2 py-1 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                title="Unassign Staff"
                                            >
                                                Unassign
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Staff Assignment Modal */}
            <Modal show={activeModal === 'assign'} onClose={() => setActiveModal(null)} maxWidth="md">
                <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Assign Staff to Window #{targetWindow?.window_number}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Select a staff member and the active service to be handled at this window station.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Staff Member <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value)}
                            required
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Choose Medical / Queue Staff --</option>
                            {staffUsers.map((user) => {
                                const currentAssigned = user.active_window_assignment?.window;
                                const isAssignedElsewhere = currentAssigned && currentAssigned.id !== targetWindow?.id;

                                return (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role}) {isAssignedElsewhere ? `[Currently at W${currentAssigned.window_number}]` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Assigned Service
                        </label>
                        <select
                            value={assignServiceId}
                            onChange={(e) => setAssignServiceId(e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- All / General Department Services --</option>
                            {targetDeptServices.map((s) => (
                                <option key={s.id} value={s.id}>
                                    [{s.prefix}] {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="open_window_checkbox"
                            checked={openOnAssign}
                            onChange={(e) => setOpenOnAssign(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="open_window_checkbox" className="text-xs text-slate-700 dark:text-slate-300">
                            Set window status to <strong className="text-emerald-600">OPEN</strong> upon assignment
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setActiveModal(null)}
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !assignUserId}
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Confirm Assignment'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

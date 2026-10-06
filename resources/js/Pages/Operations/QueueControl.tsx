import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';

interface QueueItem {
    id: number;
    queue_number: string;
    display_number: string;
    queue_sequence: number;
    status: string;
    priority_type: string;
    priority_level: number;
    patient_name: string | null;
    patient_reference: string | null;
    notes: string | null;
    called_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
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
    window: {
        id: number;
        window_number: number;
        name: string;
    } | null;
    caller: {
        id: number;
        name: string;
    } | null;
    server: {
        id: number;
        name: string;
    } | null;
}

interface PaginatedQueues {
    data: QueueItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface DepartmentData {
    id: number;
    code: string;
    name: string;
    services: Array<{ id: number; code: string; name: string; prefix: string }>;
    windows: Array<{ id: number; window_number: number; name: string }>;
}

interface Props extends PageProps {
    queues: PaginatedQueues;
    departments: DepartmentData[];
    filters: {
        search?: string;
        date?: string;
        department_id?: number | null;
        service_id?: number | null;
        window_id?: number | null;
        status?: string;
        priority?: string;
    };
    statuses: Array<{ value: string; label: string; badge: string }>;
    priorities: Array<{ value: string; label: string; badge: string }>;
}

export default function QueueControlCenter({
    auth,
    queues,
    departments,
    filters,
    statuses,
    priorities,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [date, setDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [deptId, setDeptId] = useState(filters.department_id ? String(filters.department_id) : '');
    const [serviceId, setServiceId] = useState(filters.service_id ? String(filters.service_id) : '');
    const [windowId, setWindowId] = useState(filters.window_id ? String(filters.window_id) : '');
    const [status, setStatus] = useState(filters.status || '');
    const [priority, setPriority] = useState(filters.priority || '');

    // Modals
    const [activeModal, setActiveModal] = useState<'transfer' | 'cancel' | 'priority' | null>(null);
    const [selectedQueue, setSelectedQueue] = useState<QueueItem | null>(null);

    // Transfer State
    const [targetDeptId, setTargetDeptId] = useState<string>('');
    const [targetServiceId, setTargetServiceId] = useState<string>('');
    const [targetWindowId, setTargetWindowId] = useState<string>('');
    const [transferReason, setTransferReason] = useState<string>('');

    // Cancel State
    const [cancelReason, setCancelReason] = useState<string>('');

    // Priority State
    const [newPriority, setNewPriority] = useState<string>('REGULAR');
    const [priorityReason, setPriorityReason] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const applyFilters = () => {
        router.get(
            route('operations.queues'),
            {
                search: search || undefined,
                date: date || undefined,
                department_id: deptId ? Number(deptId) : undefined,
                service_id: serviceId ? Number(serviceId) : undefined,
                window_id: windowId ? Number(windowId) : undefined,
                status: status || undefined,
                priority: priority || undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    // Open Modals
    const openTransferModal = (q: QueueItem) => {
        setSelectedQueue(q);
        setTargetDeptId('');
        setTargetServiceId('');
        setTargetWindowId('');
        setTransferReason('');
        setActiveModal('transfer');
    };

    const openCancelModal = (q: QueueItem) => {
        setSelectedQueue(q);
        setCancelReason('');
        setActiveModal('cancel');
    };

    const openPriorityModal = (q: QueueItem) => {
        setSelectedQueue(q);
        setNewPriority(q.priority_type);
        setPriorityReason('');
        setActiveModal('priority');
    };

    // Action Handlers
    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQueue || !targetDeptId || !targetServiceId) return;

        setIsSubmitting(true);
        router.post(
            route('operations.queues.transfer', selectedQueue.id),
            {
                target_department_id: Number(targetDeptId),
                target_service_id: Number(targetServiceId),
                target_window_id: targetWindowId ? Number(targetWindowId) : undefined,
                reason: transferReason || undefined,
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

    const handleCancelSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQueue) return;

        setIsSubmitting(true);
        router.post(
            route('operations.queues.cancel', selectedQueue.id),
            { reason: cancelReason || undefined },
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

    const handlePrioritySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQueue) return;

        setIsSubmitting(true);
        router.post(
            route('operations.queues.priority', selectedQueue.id),
            {
                priority_type: newPriority,
                reason: priorityReason || undefined,
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

    // Services & Windows of selected department in filter & modal
    const filterDept = departments.find((d) => d.id === Number(deptId));
    const targetDept = departments.find((d) => d.id === Number(targetDeptId));

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Centralized Queue Control Center
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Comprehensive administrative queue oversight, ticket transfers, emergency overrides, and cancellations.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Queue Control Center" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Filters Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Search Patient / Ticket
                            </label>
                            <input
                                type="text"
                                placeholder="Search by ticket # or name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Department
                            </label>
                            <select
                                value={deptId}
                                onChange={(e) => {
                                    setDeptId(e.target.value);
                                    setServiceId('');
                                    setWindowId('');
                                }}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-teal-500 focus:border-teal-500"
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
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Service
                            </label>
                            <select
                                value={serviceId}
                                onChange={(e) => setServiceId(e.target.value)}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Services</option>
                                {filterDept?.services.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        [{s.prefix}] {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Statuses</option>
                                {statuses.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Priority Level
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">All Priorities</option>
                                {priorities.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end gap-2 sm:col-span-2">
                            <button
                                type="submit"
                                className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-teal-600 hover:bg-teal-700 shadow-sm"
                            >
                                Apply Filters
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setDeptId('');
                                    setServiceId('');
                                    setWindowId('');
                                    setStatus('');
                                    setPriority('');
                                    router.get(route('operations.queues'));
                                }}
                                className="px-3 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700"
                            >
                                Reset
                            </button>
                        </div>
                    </form>
                </div>

                {/* Queues Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Total Tickets: {queues.total}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4">Queue #</th>
                                    <th className="py-3 px-4">Patient / Ref</th>
                                    <th className="py-3 px-4">Department & Service</th>
                                    <th className="py-3 px-4">Priority</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Window / Staff</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {queues.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No queue tickets found matching the specified criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    queues.data.map((q) => {
                                        const isTerminal = ['completed', 'skipped', 'transferred', 'cancelled'].includes(q.status);

                                        return (
                                            <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                    <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-sm">
                                                        {q.display_number || q.queue_number}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {q.patient_name || 'Anonymous'}
                                                    </div>
                                                    {q.patient_reference && (
                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                            MRN: {q.patient_reference}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                        {q.service?.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {q.department?.name}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        q.priority_type === 'EMERGENCY'
                                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-black'
                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {q.priority_type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                                        {q.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {q.window ? (
                                                        <div>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                W{q.window.window_number}
                                                            </span>
                                                            {q.server && (
                                                                <span className="text-[10px] text-slate-400 block">
                                                                    {q.server.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right space-x-1">
                                                    {!isTerminal && (
                                                        <>
                                                            <button
                                                                onClick={() => openTransferModal(q)}
                                                                className="px-2 py-1 text-[11px] font-semibold rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100"
                                                                title="Transfer Queue"
                                                            >
                                                                Transfer
                                                            </button>
                                                            <button
                                                                onClick={() => openPriorityModal(q)}
                                                                className="px-2 py-1 text-[11px] font-semibold rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
                                                                title="Change Priority"
                                                            >
                                                                Priority
                                                            </button>
                                                            <button
                                                                onClick={() => openCancelModal(q)}
                                                                className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                                                                title="Cancel Ticket"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {queues.links.length > 3 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex gap-1">
                                {queues.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                        className={`px-3 py-1 text-xs rounded-lg ${
                                            link.active
                                                ? 'bg-teal-600 text-white font-bold'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-50'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Transfer Modal */}
            <Modal show={activeModal === 'transfer'} onClose={() => setActiveModal(null)} maxWidth="md">
                <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Transfer Queue #{selectedQueue?.display_number || selectedQueue?.queue_number}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Transfer this patient ticket to another hospital department, service, or dedicated window counter.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Destination Department <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={targetDeptId}
                            onChange={(e) => {
                                setTargetDeptId(e.target.value);
                                setTargetServiceId('');
                                setTargetWindowId('');
                            }}
                            required
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-cyan-500 focus:border-cyan-500"
                        >
                            <option value="">-- Choose Department --</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Destination Service <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={targetServiceId}
                            onChange={(e) => setTargetServiceId(e.target.value)}
                            required
                            disabled={!targetDeptId}
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50"
                        >
                            <option value="">-- Choose Target Service --</option>
                            {targetDept?.services.map((s) => (
                                <option key={s.id} value={s.id}>
                                    [{s.prefix}] {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Target Window (Optional)
                        </label>
                        <select
                            value={targetWindowId}
                            onChange={(e) => setTargetWindowId(e.target.value)}
                            disabled={!targetDeptId}
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50"
                        >
                            <option value="">-- General Waiting Queue --</option>
                            {targetDept?.windows.map((w) => (
                                <option key={w.id} value={w.id}>
                                    Window #{w.window_number} ({w.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Transfer Reason
                        </label>
                        <textarea
                            value={transferReason}
                            onChange={(e) => setTransferReason(e.target.value)}
                            rows={2}
                            placeholder="e.g. Referred for complete blood count / lab tests"
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
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
                            disabled={isSubmitting || !targetDeptId || !targetServiceId}
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Cancel Modal */}
            <Modal show={activeModal === 'cancel'} onClose={() => setActiveModal(null)} maxWidth="sm">
                <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Cancel Queue #{selectedQueue?.display_number || selectedQueue?.queue_number}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Are you sure you want to cancel this ticket? This action is audited and cannot be undone.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for Cancellation
                        </label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            rows={3}
                            placeholder="e.g. Patient left hospital premises / registered in wrong department"
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-rose-500 focus:border-rose-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setActiveModal(null)}
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Change Priority Modal */}
            <Modal show={activeModal === 'priority'} onClose={() => setActiveModal(null)} maxWidth="sm">
                <form onSubmit={handlePrioritySubmit} className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Change Priority for #{selectedQueue?.display_number || selectedQueue?.queue_number}
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Priority Classification
                        </label>
                        <select
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            {priorities.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Audit Reason / Notes
                        </label>
                        <textarea
                            value={priorityReason}
                            onChange={(e) => setPriorityReason(e.target.value)}
                            rows={3}
                            placeholder="e.g. Patient requires immediate emergency triage / presented senior citizen ID"
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-purple-500 focus:border-purple-500"
                        />
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
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-purple-600 hover:bg-purple-700 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Updating...' : 'Update Priority'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

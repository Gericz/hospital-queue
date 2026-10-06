import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';

interface ServiceOperatingHour {
    id: number;
    service_id: number;
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_enabled: boolean;
}

interface ServiceItem {
    id: number;
    department_id: number;
    code: string;
    name: string;
    description: string | null;
    prefix: string;
    status: 'available' | 'paused' | 'closed' | 'maintenance';
    status_reason: string | null;
    max_daily_queue: number | null;
    max_waiting_queue: number | null;
    max_priority_queue: number | null;
    open_time: string | null;
    close_time: string | null;
    is_active: boolean;
    department: {
        id: number;
        code: string;
        name: string;
        status: string;
    } | null;
    operating_hours: ServiceOperatingHour[];
}

interface DepartmentItem {
    id: number;
    code: string;
    name: string;
    status: 'open' | 'closed' | 'paused';
    status_reason: string | null;
    is_active: boolean;
}

interface Props extends PageProps {
    services: ServiceItem[];
    departments: DepartmentItem[];
    settings: Record<string, any>;
    serviceStatuses: Array<{ value: string; label: string; badge: string }>;
    departmentStatuses: Array<{ value: string; label: string; badge: string }>;
}

const DAY_NAMES: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
};

export default function OperationsServices({
    auth,
    services,
    departments,
    settings,
    serviceStatuses,
    departmentStatuses,
}: Props) {
    const [activeModal, setActiveModal] = useState<'service_status' | 'dept_status' | 'operating_hours' | null>(null);
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
    const [selectedDept, setSelectedDept] = useState<DepartmentItem | null>(null);

    // Service Status Form
    const [serviceStatus, setServiceStatus] = useState<string>('available');
    const [serviceReason, setServiceReason] = useState<string>('');
    const [maxDaily, setMaxDaily] = useState<string>('');
    const [maxWaiting, setMaxWaiting] = useState<string>('');
    const [maxPriority, setMaxPriority] = useState<string>('');

    // Department Status Form
    const [deptStatus, setDeptStatus] = useState<string>('open');
    const [deptReason, setDeptReason] = useState<string>('');

    // Operating Hours Schedule Form (7 days)
    const [weeklySchedule, setWeeklySchedule] = useState<Array<{
        day_of_week: number;
        open_time: string;
        close_time: string;
        is_enabled: boolean;
    }>>([]);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Open Service Status Modal
    const openServiceModal = (s: ServiceItem) => {
        setSelectedService(s);
        setServiceStatus(s.status);
        setServiceReason(s.status_reason || '');
        setMaxDaily(s.max_daily_queue ? String(s.max_daily_queue) : '');
        setMaxWaiting(s.max_waiting_queue ? String(s.max_waiting_queue) : '');
        setMaxPriority(s.max_priority_queue ? String(s.max_priority_queue) : '');
        setActiveModal('service_status');
    };

    // Open Dept Status Modal
    const openDeptModal = (d: DepartmentItem) => {
        setSelectedDept(d);
        setDeptStatus(d.status);
        setDeptReason(d.status_reason || '');
        setActiveModal('dept_status');
    };

    // Open Operating Hours Modal
    const openHoursModal = (s: ServiceItem) => {
        setSelectedService(s);

        // Build 7 days schedule initialized from existing or defaults
        const existingMap = new Map<number, ServiceOperatingHour>();
        (s.operating_hours || []).forEach((h) => existingMap.set(h.day_of_week, h));

        const schedule = [1, 2, 3, 4, 5, 6, 7].map((day) => {
            const row = existingMap.get(day);
            return {
                day_of_week: day,
                open_time: row ? row.open_time.slice(0, 5) : '08:00',
                close_time: row ? row.close_time.slice(0, 5) : (day === 6 ? '12:00' : '17:00'),
                is_enabled: row ? row.is_enabled : (day !== 7), // default Sunday closed
            };
        });

        setWeeklySchedule(schedule);
        setActiveModal('operating_hours');
    };

    // Submissions
    const handleServiceStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService) return;

        setIsSubmitting(true);
        router.post(
            route('operations.services.status', selectedService.id),
            {
                status: serviceStatus,
                status_reason: serviceReason || undefined,
                max_daily_queue: maxDaily ? Number(maxDaily) : undefined,
                max_waiting_queue: maxWaiting ? Number(maxWaiting) : undefined,
                max_priority_queue: maxPriority ? Number(maxPriority) : undefined,
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

    const handleDeptStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDept) return;

        setIsSubmitting(true);
        router.post(
            route('operations.departments.status', selectedDept.id),
            {
                status: deptStatus,
                status_reason: deptReason || undefined,
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

    const handleHoursSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService) return;

        setIsSubmitting(true);
        router.post(
            route('operations.services.operating-hours', selectedService.id),
            { schedules: weeklySchedule },
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

    const updateScheduleRow = (index: number, key: string, value: any) => {
        setWeeklySchedule((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Service Availability & Operating Hours
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Control department and service operational states, maintenance notices, and weekly schedules.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Service Availability & Operating Hours" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Departments Operational Status */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                            Department Operational States
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Closing a department blocks new patient ticket registrations while preserving existing queue records.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4">Code</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4">Public Notice / Status Reason</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {departments.map((d) => (
                                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                            {d.name}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-slate-500">
                                            {d.code}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                d.status === 'open'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : d.status === 'paused'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                            }`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                                            {d.status_reason || <span className="text-slate-400 italic">No notice specified</span>}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => openDeptModal(d)}
                                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                                            >
                                                Configure Status
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Services Operational Status & Hours */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                            Hospital Services & Operating Schedules
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Set capacity thresholds, operational availability, maintenance reasons, and weekly time windows.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4">Service</th>
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Caps (Daily / Waiting)</th>
                                    <th className="py-3 px-4">Status Notice</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {services.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-[10px]">
                                                    {s.prefix}
                                                </span>
                                                {s.name}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono">{s.code}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                            {s.department?.name}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                s.status === 'available'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : s.status === 'paused'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                    : s.status === 'maintenance'
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">
                                            <span className="font-semibold">{s.max_daily_queue || '∞'}</span>
                                            <span className="text-slate-400 mx-1">/</span>
                                            <span className="font-semibold">{s.max_waiting_queue || '∞'}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                                            {s.status_reason || <span className="text-slate-400 italic">—</span>}
                                        </td>
                                        <td className="py-3 px-4 text-right space-x-1">
                                            <button
                                                onClick={() => openHoursModal(s)}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
                                            >
                                                Weekly Hours
                                            </button>
                                            <button
                                                onClick={() => openServiceModal(s)}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                                            >
                                                Status & Caps
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Department Status Modal */}
            <Modal show={activeModal === 'dept_status'} onClose={() => setActiveModal(null)} maxWidth="sm">
                <form onSubmit={handleDeptStatusSubmit} className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Department Operational Status: {selectedDept?.name}
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Status
                        </label>
                        <select
                            value={deptStatus}
                            onChange={(e) => setDeptStatus(e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {departmentStatuses.map((st) => (
                                <option key={st.value} value={st.value}>
                                    {st.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Public Notice / Reason (Optional)
                        </label>
                        <textarea
                            value={deptReason}
                            onChange={(e) => setDeptReason(e.target.value)}
                            rows={3}
                            placeholder="e.g. Closed for scheduled staff sanitization until 1:00 PM"
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Department Status'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Service Status & Capacity Caps Modal */}
            <Modal show={activeModal === 'service_status'} onClose={() => setActiveModal(null)} maxWidth="md">
                <form onSubmit={handleServiceStatusSubmit} className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Service Status & Caps: {selectedService?.name}
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Operational Availability
                        </label>
                        <select
                            value={serviceStatus}
                            onChange={(e) => setServiceStatus(e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {serviceStatuses.map((st) => (
                                <option key={st.value} value={st.value}>
                                    {st.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Public Reason / Notice
                        </label>
                        <textarea
                            value={serviceReason}
                            onChange={(e) => setServiceReason(e.target.value)}
                            rows={2}
                            placeholder="e.g. Temporarily unavailable due to equipment maintenance."
                            className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Max Daily Tickets (Cap)
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0 = Unlimited"
                                value={maxDaily}
                                onChange={(e) => setMaxDaily(e.target.value)}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Max Concurrent Waiting Queue
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0 = Unlimited"
                                value={maxWaiting}
                                onChange={(e) => setMaxWaiting(e.target.value)}
                                className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1.5 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
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
                            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Service Settings'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Weekly Operating Hours Modal */}
            <Modal show={activeModal === 'operating_hours'} onClose={() => setActiveModal(null)} maxWidth="2xl">
                <form onSubmit={handleHoursSubmit} className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Weekly Operating Hours Schedule: {selectedService?.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Configure regular operating hours for each day of the week. Registrations outside these windows will be blocked.
                    </p>

                    <div className="space-y-2.5 pt-2">
                        {weeklySchedule.map((row, idx) => (
                            <div
                                key={row.day_of_week}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                                    row.is_enabled
                                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-800 text-slate-400 opacity-75'
                                }`}
                            >
                                <div className="flex items-center gap-3 w-32">
                                    <input
                                        type="checkbox"
                                        id={`day_${row.day_of_week}`}
                                        checked={row.is_enabled}
                                        onChange={(e) => updateScheduleRow(idx, 'is_enabled', e.target.checked)}
                                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <label htmlFor={`day_${row.day_of_week}`} className="font-bold text-slate-800 dark:text-slate-200">
                                        {DAY_NAMES[row.day_of_week]}
                                    </label>
                                </div>

                                {row.is_enabled ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[11px] text-slate-500">Open:</span>
                                            <input
                                                type="time"
                                                value={row.open_time}
                                                onChange={(e) => updateScheduleRow(idx, 'open_time', e.target.value)}
                                                className="text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1 px-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </div>
                                        <span className="text-slate-400">—</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[11px] text-slate-500">Close:</span>
                                            <input
                                                type="time"
                                                value={row.close_time}
                                                onChange={(e) => updateScheduleRow(idx, 'close_time', e.target.value)}
                                                className="text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-1 px-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                                        Closed all day
                                    </span>
                                )}
                            </div>
                        ))}
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
                            {isSubmitting ? 'Saving Schedule...' : 'Save Operating Schedule'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { NotificationLog, PaginatedData, QueueSettingData } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';

interface Props {
    logs: PaginatedData<NotificationLog>;
    stats: {
        total_sent: number;
        total_pending: number;
        total_failed: number;
        today_sent: number;
    };
    settings: QueueSettingData;
    filters: {
        status?: string;
        type?: string;
        search?: string;
    };
    providers: { value: string; label: string }[];
}

export default function Index({ logs, stats, settings, filters, providers }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);

    // Test SMS Form
    const testForm = useForm({
        phone_number: '',
        custom_message: '',
    });

    const handleFilterChange = (newStatus = statusFilter, newType = typeFilter, newSearch = search) => {
        router.get(
            route('notifications.index'),
            {
                status: newStatus || undefined,
                type: newType || undefined,
                search: newSearch || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange(statusFilter, typeFilter, search);
    };

    const handleRetry = (id: number) => {
        router.post(route('notifications.retry', id), {}, { preserveScroll: true });
    };

    const submitTestSms = (e: React.FormEvent) => {
        e.preventDefault();
        testForm.post(route('settings.notifications.test-sms'), {
            onSuccess: () => {
                setIsTestModalOpen(false);
                testForm.reset();
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
            case 'failed':
                return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
            case 'pending':
                return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                            Patient Notifications & SMS Gateway
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Delivery logs, retry mechanisms, and SMS provider audit trails
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsTestModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300/80 dark:border-slate-700 transition shadow-sm"
                        >
                            <span>📲</span>
                            <span>Send Test SMS</span>
                        </button>
                        <Link href={route('settings.notifications.edit')}>
                            <PrimaryButton className="text-xs py-2 px-3.5 gap-1.5">
                                <span>⚙️</span>
                                <span>SMS Settings</span>
                            </PrimaryButton>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Patient Notifications & SMS Gateway - MedQueue" />

            <div className="space-y-6">
                {/* Operational KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Sent</span>
                            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">✓</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            {stats.total_sent.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                            {stats.today_sent} delivered today
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending / Queue</span>
                            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">⏳</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            {stats.total_pending.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Awaiting background worker
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Delivery Failed</span>
                            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">✕</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            {stats.total_failed.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                            Inspect error reasons below
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gateway Status</span>
                            <span className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">📡</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-2 uppercase">
                            {settings.sms_provider}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            SMS {settings.enable_sms ? 'Enabled (Active)' : 'Disabled in Settings'}
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
                        <TextInput
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by ticket #, recipient or idempotency key..."
                            className="w-full text-xs"
                        />
                        <SecondaryButton type="submit" className="text-xs shrink-0 py-2">
                            Search
                        </SecondaryButton>
                    </form>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                handleFilterChange(e.target.value, typeFilter, search);
                            }}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-teal-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="sent">Delivered (Sent)</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                handleFilterChange(statusFilter, e.target.value, search);
                            }}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-teal-500"
                        >
                            <option value="">All Notification Types</option>
                            <option value="called">Called</option>
                            <option value="nearing">Nearing Service</option>
                            <option value="transferred">Transferred</option>
                            <option value="completed">Completed</option>
                            <option value="test_sms">Test SMS</option>
                        </select>
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Log ID</th>
                                    <th className="py-3 px-4">Ticket</th>
                                    <th className="py-3 px-4">Event Type</th>
                                    <th className="py-3 px-4">Recipient (Masked)</th>
                                    <th className="py-3 px-4">Message Preview</th>
                                    <th className="py-3 px-4">Provider</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Attempts</th>
                                    <th className="py-3 px-4">Sent / Logged At</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                                {logs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-8 text-center text-slate-400">
                                            No notification logs found matching the selected criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-400">
                                                #{log.id}
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.queue ? (
                                                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                                                        {log.queue.queue_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {log.notification_type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[11px]">
                                                {log.recipient}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs truncate text-[11px]" title={log.message_body}>
                                                {log.message_body}
                                            </td>
                                            <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                                                {log.provider}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(log.status)}`}>
                                                    {log.status.toUpperCase()}
                                                </span>
                                                {log.error_message && (
                                                    <div className="text-[10px] text-rose-500 truncate max-w-[150px] mt-0.5" title={log.error_message}>
                                                        {log.error_message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center font-mono">
                                                {log.attempts}
                                            </td>
                                            <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                                                {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {log.status === 'failed' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRetry(log.id)}
                                                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:hover:bg-teal-900 dark:text-teal-300 text-[10px] font-bold transition"
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs.links && logs.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                Showing {logs.from || 0} to {logs.to || 0} of {logs.total} entries
                            </div>
                            <div className="flex items-center space-x-1">
                                {logs.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 text-xs rounded-lg border transition ${
                                            link.active
                                                ? 'bg-teal-600 text-white border-teal-600 font-bold'
                                                : link.url
                                                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                : 'text-slate-400 border-transparent cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Send Test SMS Modal */}
            <Modal show={isTestModalOpen} onClose={() => setIsTestModalOpen(false)}>
                <form onSubmit={submitTestSms} className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Send Test SMS Message
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Verify your configured SMS gateway ({settings.sms_provider}) by sending a test dispatch.
                    </p>

                    <div>
                        <InputLabel htmlFor="test_phone" value="Recipient Mobile Number (e.g. 09171234567)" />
                        <TextInput
                            id="test_phone"
                            value={testForm.data.phone_number}
                            onChange={(e) => testForm.setData('phone_number', e.target.value)}
                            placeholder="09171234567"
                            className="mt-1 block w-full text-sm"
                            required
                        />
                    </div>

                    <div>
                        <InputLabel htmlFor="custom_message" value="Custom Message Body (Optional)" />
                        <textarea
                            id="custom_message"
                            value={testForm.data.custom_message}
                            onChange={(e) => testForm.setData('custom_message', e.target.value)}
                            rows={3}
                            placeholder="Leave blank for standard gateway test message..."
                            className="mt-1 block w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setIsTestModalOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={testForm.processing}>
                            {testForm.processing ? 'Dispatching...' : 'Send Test SMS'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

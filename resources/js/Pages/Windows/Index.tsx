import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import DataTable, { Column } from '@/Components/DataTable';
import StatusBadge from '@/Components/StatusBadge';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SelectInput from '@/Components/Form/SelectInput';

interface Department {
    id: number;
    code: string;
    name: string;
}

interface Window {
    id: number;
    department_id: number;
    department?: Department;
    window_number: string;
    name: string;
    is_active: boolean;
}

interface Props {
    windows: {
        data: Window[];
        links: any[];
        from: number;
        to: number;
        total: number;
    };
    departments: Department[];
    filters: {
        search?: string;
        department_id?: string;
        status?: string;
    };
    can: {
        create: boolean;
    };
}

export default function Index({ windows, departments, filters, can }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters.department_id || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingWindow, setEditingWindow] = useState<Window | null>(null);

    const createForm = useForm({
        department_id: '',
        window_number: '',
        name: '',
        is_active: true,
    });

    const editForm = useForm({
        department_id: '',
        window_number: '',
        name: '',
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('windows.index'),
            { search, department_id: departmentFilter, status: statusFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleToggleStatus = (window: Window) => {
        router.patch(route('windows.toggle-status', window.id), {}, { preserveScroll: true });
    };

    const openEditModal = (window: Window) => {
        setEditingWindow(window);
        editForm.setData({
            department_id: String(window.department_id),
            window_number: window.window_number,
            name: window.name,
            is_active: window.is_active,
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('windows.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWindow) return;
        editForm.put(route('windows.update', editingWindow.id), {
            onSuccess: () => {
                setEditingWindow(null);
                editForm.reset();
            },
        });
    };

    const columns: Column<Window>[] = [
        {
            header: 'Counter / Window #',
            accessor: (window) => (
                <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center text-sm">
                        {window.window_number}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{window.name}</span>
                </div>
            ),
        },
        {
            header: 'Department',
            accessor: (window) => (
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {window.department?.name ?? '—'}
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: (window) => <StatusBadge status={window.is_active} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            accessor: (window) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleToggleStatus(window)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                            window.is_active
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                    >
                        {window.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {can.create && (
                        <button
                            onClick={() => openEditModal(window)}
                            className="text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        >
                            Edit
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                            Window & Counter Management
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Configure physical service counters and triage desks
                        </p>
                    </div>
                    {can.create && (
                        <PrimaryButton onClick={() => setIsCreateOpen(true)}>
                            Add Window Counter
                        </PrimaryButton>
                    )}
                </div>
            }
        >
            <Head title="Windows & Counters - MedQueue" />

            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <form onSubmit={handleSearch} className="flex flex-1 gap-2 w-full sm:w-auto">
                        <TextInput
                            type="text"
                            placeholder="Search by window # or name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full sm:max-w-md text-sm"
                        />
                        <SecondaryButton type="submit">Filter</SecondaryButton>
                    </form>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <select
                            value={departmentFilter}
                            onChange={(e) => {
                                setDepartmentFilter(e.target.value);
                                router.get(
                                    route('windows.index'),
                                    { search, department_id: e.target.value, status: statusFilter },
                                    { preserveState: true, replace: true }
                                );
                            }}
                            className="text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                router.get(
                                    route('windows.index'),
                                    { search, department_id: departmentFilter, status: e.target.value },
                                    { preserveState: true, replace: true }
                                );
                            }}
                            className="text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                        >
                            <option value="">All Statuses</option>
                            <option value="1">Active Only</option>
                            <option value="0">Inactive Only</option>
                        </select>
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={windows.data}
                    pagination={windows}
                    emptyMessage="No service counters configured yet."
                />
            </div>

            {/* Create Window Modal */}
            <Modal show={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="lg">
                <form onSubmit={handleCreate} className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Service Counter</h3>
                    <p className="text-xs text-slate-500 mb-4">Add a new physical service window to a department.</p>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="department_id" value="Department" />
                            <SelectInput
                                id="department_id"
                                value={createForm.data.department_id}
                                onChange={(e) => createForm.setData('department_id', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Select Department"
                                required
                            >
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                ))}
                            </SelectInput>
                            <InputError message={createForm.errors.department_id} className="mt-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="window_number" value="Window / Counter #" />
                                <TextInput
                                    id="window_number"
                                    value={createForm.data.window_number}
                                    onChange={(e) => createForm.setData('window_number', e.target.value)}
                                    placeholder="e.g. 1, 2, Desk-A"
                                    className="mt-1 block w-full"
                                    required
                                />
                                <InputError message={createForm.errors.window_number} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="name" value="Counter Name / Label" />
                                <TextInput
                                    id="name"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder="e.g. Consultation Desk 1"
                                    className="mt-1 block w-full"
                                    required
                                />
                                <InputError message={createForm.errors.name} className="mt-1" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsCreateOpen(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createForm.processing}>
                            {createForm.processing ? 'Saving...' : 'Save Window'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Edit Window Modal */}
            <Modal show={!!editingWindow} onClose={() => setEditingWindow(null)} maxWidth="lg">
                <form onSubmit={handleUpdate} className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Service Counter</h3>
                    <p className="text-xs text-slate-500 mb-4">Modify window counter details.</p>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="edit_department_id" value="Department" />
                            <SelectInput
                                id="edit_department_id"
                                value={editForm.data.department_id}
                                onChange={(e) => editForm.setData('department_id', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Select Department"
                                required
                            >
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                ))}
                            </SelectInput>
                            <InputError message={editForm.errors.department_id} className="mt-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="edit_window_number" value="Window / Counter #" />
                                <TextInput
                                    id="edit_window_number"
                                    value={editForm.data.window_number}
                                    onChange={(e) => editForm.setData('window_number', e.target.value)}
                                    className="mt-1 block w-full"
                                    required
                                />
                                <InputError message={editForm.errors.window_number} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="edit_name" value="Counter Name / Label" />
                                <TextInput
                                    id="edit_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="mt-1 block w-full"
                                    required
                                />
                                <InputError message={editForm.errors.name} className="mt-1" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setEditingWindow(null)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={editForm.processing}>
                            {editForm.processing ? 'Updating...' : 'Update Window'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}


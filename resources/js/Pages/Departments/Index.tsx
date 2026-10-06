import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import DataTable, { Column } from '@/Components/DataTable';
import StatusBadge from '@/Components/StatusBadge';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import TextArea from '@/Components/Form/TextArea';

interface Department {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    services_count?: number;
    windows_count?: number;
}

interface Props {
    departments: {
        data: Department[];
        links: any[];
        from: number;
        to: number;
        total: number;
    };
    filters: {
        search?: string;
        status?: string;
    };
    can: {
        create: boolean;
    };
}

export default function Index({ departments, filters, can }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

    const createForm = useForm({
        code: '',
        name: '',
        description: '',
        is_active: true,
    });

    const editForm = useForm({
        code: '',
        name: '',
        description: '',
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('departments.index'),
            { search, status: statusFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleToggleStatus = (department: Department) => {
        router.patch(route('departments.toggle-status', department.id), {}, { preserveScroll: true });
    };

    const openEditModal = (department: Department) => {
        setEditingDepartment(department);
        editForm.setData({
            code: department.code,
            name: department.name,
            description: department.description || '',
            is_active: department.is_active,
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('departments.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDepartment) return;
        editForm.put(route('departments.update', editingDepartment.id), {
            onSuccess: () => {
                setEditingDepartment(null);
                editForm.reset();
            },
        });
    };

    const columns: Column<Department>[] = [
        {
            header: 'Code',
            accessor: (dept) => (
                <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                    {dept.code}
                </span>
            ),
        },
        {
            header: 'Department Name',
            accessor: (dept) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{dept.name}</div>
                    {dept.description && (
                        <div className="text-xs text-slate-500 line-clamp-1">{dept.description}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Services',
            accessor: (dept) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {dept.services_count ?? 0} Services
                </span>
            ),
        },
        {
            header: 'Windows',
            accessor: (dept) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {dept.windows_count ?? 0} Counters
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: (dept) => <StatusBadge status={dept.is_active} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            accessor: (dept) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleToggleStatus(dept)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                            dept.is_active
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                    >
                        {dept.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {can.create && (
                        <button
                            onClick={() => openEditModal(dept)}
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
                            Department Management
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Configure hospital clinical and administrative departments
                        </p>
                    </div>
                    {can.create && (
                        <PrimaryButton onClick={() => setIsCreateOpen(true)}>
                            Add Department
                        </PrimaryButton>
                    )}
                </div>
            }
        >
            <Head title="Departments - MedQueue" />

            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                {/* Search and Filters */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <form onSubmit={handleSearch} className="flex flex-1 gap-2 w-full sm:w-auto">
                        <TextInput
                            type="text"
                            placeholder="Search by code, name or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full sm:max-w-md text-sm"
                        />
                        <SecondaryButton type="submit">Filter</SecondaryButton>
                    </form>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                router.get(
                                    route('departments.index'),
                                    { search, status: e.target.value },
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

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={departments.data}
                    pagination={departments}
                    emptyMessage="No hospital departments configured yet."
                />
            </div>

            {/* Create Department Modal */}
            <Modal show={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="lg">
                <form onSubmit={handleCreate} className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Department</h3>
                    <p className="text-xs text-slate-500 mb-4">Add a new hospital department for queue routing.</p>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="code" value="Department Code (e.g. OPD, ER, LAB)" />
                            <TextInput
                                id="code"
                                value={createForm.data.code}
                                onChange={(e) => createForm.setData('code', e.target.value.toUpperCase())}
                                className="mt-1 block w-full uppercase"
                                required
                            />
                            <InputError message={createForm.errors.code} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="name" value="Department Name" />
                            <TextInput
                                id="name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={createForm.errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="description" value="Description (Optional)" />
                            <TextArea
                                id="description"
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                                className="mt-1 block w-full rows-3"
                            />
                            <InputError message={createForm.errors.description} className="mt-1" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsCreateOpen(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createForm.processing}>
                            {createForm.processing ? 'Saving...' : 'Save Department'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Edit Department Modal */}
            <Modal show={!!editingDepartment} onClose={() => setEditingDepartment(null)} maxWidth="lg">
                <form onSubmit={handleUpdate} className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Department</h3>
                    <p className="text-xs text-slate-500 mb-4">Modify department details.</p>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="edit-code" value="Department Code" />
                            <TextInput
                                id="edit-code"
                                value={editForm.data.code}
                                onChange={(e) => editForm.setData('code', e.target.value.toUpperCase())}
                                className="mt-1 block w-full uppercase"
                                required
                            />
                            <InputError message={editForm.errors.code} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit-name" value="Department Name" />
                            <TextInput
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={editForm.errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit-description" value="Description (Optional)" />
                            <TextArea
                                id="edit-description"
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                className="mt-1 block w-full rows-3"
                            />
                            <InputError message={editForm.errors.description} className="mt-1" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setEditingDepartment(null)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={editForm.processing}>
                            {editForm.processing ? 'Updating...' : 'Update Department'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}


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
import TextArea from '@/Components/Form/TextArea';
import SelectInput from '@/Components/Form/SelectInput';

interface Department {
    id: number;
    code: string;
    name: string;
}

interface Service {
    id: number;
    department_id: number;
    department?: Department;
    code: string;
    name: string;
    description: string | null;
    prefix: string;
    is_active: boolean;
}

interface Props {
    services: {
        data: Service[];
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

export default function Index({ services, departments, filters, can }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters.department_id || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    const createForm = useForm({
        department_id: '',
        code: '',
        name: '',
        description: '',
        prefix: '',
        is_active: true,
    });

    const editForm = useForm({
        department_id: '',
        code: '',
        name: '',
        description: '',
        prefix: '',
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('services.index'),
            { search, department_id: departmentFilter, status: statusFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleToggleStatus = (service: Service) => {
        router.patch(route('services.toggle-status', service.id), {}, { preserveScroll: true });
    };

    const openEditModal = (service: Service) => {
        setEditingService(service);
        editForm.setData({
            department_id: String(service.department_id),
            code: service.code,
            name: service.name,
            description: service.description || '',
            prefix: service.prefix,
            is_active: service.is_active,
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('services.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService) return;
        editForm.put(route('services.update', editingService.id), {
            onSuccess: () => {
                setEditingService(null);
                editForm.reset();
            },
        });
    };

    const columns: Column<Service>[] = [
        {
            header: 'Prefix / Code',
            accessor: (service) => (
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-mono font-bold text-xs">
                        {service.prefix}
                    </span>
                    <span className="font-mono text-xs text-slate-500">{service.code}</span>
                </div>
            ),
        },
        {
            header: 'Service Name',
            accessor: (service) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{service.name}</div>
                    {service.description && (
                        <div className="text-xs text-slate-500 line-clamp-1">{service.description}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Department',
            accessor: (service) => (
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {service.department?.name ?? '—'}
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: (service) => <StatusBadge status={service.is_active} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            accessor: (service) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleToggleStatus(service)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                            service.is_active
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                    >
                        {service.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {can.create && (
                        <button
                            onClick={() => openEditModal(service)}
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
                            Service Management
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Manage patient services, prefixes, and queue categories
                        </p>
                    </div>
                    {can.create && (
                        <PrimaryButton onClick={() => setIsCreateOpen(true)}>
                            Add Service
                        </PrimaryButton>
                    )}
                </div>
            }
        >
            <Head title="Services - MedQueue" />

            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <form onSubmit={handleSearch} className="flex flex-1 gap-2 w-full sm:w-auto">
                        <TextInput
                            type="text"
                            placeholder="Search by code, prefix or name..."
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
                                    route('services.index'),
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
                                    route('services.index'),
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
                    data={services.data}
                    pagination={services}
                    emptyMessage="No clinical services configured yet."
                />
            </div>

            {/* Create Service Modal */}
            <Modal show={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="lg">
                <form onSubmit={handleCreate} className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Hospital Service</h3>
                    <p className="text-xs text-slate-500 mb-4">Define service ticket category and ticket prefix.</p>

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
                                <InputLabel htmlFor="code" value="Service Code (e.g. OPD-GEN)" />
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
                                <InputLabel htmlFor="prefix" value="Ticket Prefix (e.g. OPD, LAB)" />
                                <TextInput
                                    id="prefix"
                                    value={createForm.data.prefix}
                                    onChange={(e) => createForm.setData('prefix', e.target.value.toUpperCase())}
                                    className="mt-1 block w-full uppercase"
                                    maxLength={10}
                                    required
                                />
                                <InputError message={createForm.errors.prefix} className="mt-1" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="name" value="Service Name" />
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
                            {createForm.processing ? 'Saving...' : 'Save Service'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Edit Service Modal */}
            <Modal show={!!editingService} onClose={() => setEditingService(null)} maxWidth="lg">
                <form onSubmit={handleUpdate} className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Hospital Service</h3>
                    <p className="text-xs text-slate-500 mb-4">Modify service configuration and prefix.</p>

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
                                <InputLabel htmlFor="edit_code" value="Service Code" />
                                <TextInput
                                    id="edit_code"
                                    value={editForm.data.code}
                                    onChange={(e) => editForm.setData('code', e.target.value.toUpperCase())}
                                    className="mt-1 block w-full uppercase"
                                    required
                                />
                                <InputError message={editForm.errors.code} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="edit_prefix" value="Ticket Prefix" />
                                <TextInput
                                    id="edit_prefix"
                                    value={editForm.data.prefix}
                                    onChange={(e) => editForm.setData('prefix', e.target.value.toUpperCase())}
                                    className="mt-1 block w-full uppercase"
                                    maxLength={10}
                                    required
                                />
                                <InputError message={editForm.errors.prefix} className="mt-1" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_name" value="Service Name" />
                            <TextInput
                                id="edit_name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={editForm.errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_description" value="Description (Optional)" />
                            <TextArea
                                id="edit_description"
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                className="mt-1 block w-full rows-3"
                            />
                            <InputError message={editForm.errors.description} className="mt-1" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setEditingService(null)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={editForm.processing}>
                            {editForm.processing ? 'Updating...' : 'Update Service'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}


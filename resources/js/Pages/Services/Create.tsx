import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Department } from '@/types';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import TextArea from '@/Components/Form/TextArea';
import SelectInput from '@/Components/Form/SelectInput';
import ToggleSwitch from '@/Components/Form/ToggleSwitch';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface CreateProps {
    departments: Department[];
}

interface ServiceFormData {
    department_id: string;
    code: string;
    name: string;
    description: string;
    prefix: string;
    is_active: boolean;
}

export default function Create({ departments }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm<ServiceFormData>({
        department_id: departments.length > 0 ? String(departments[0].id) : '',
        code: '',
        name: '',
        description: '',
        prefix: '',
        is_active: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('services.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Link
                        href={route('services.index')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Create Hospital Service
                        </h2>
                        <p className="text-xs text-slate-500">
                            Configure a clinical queue service and ticket prefix
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Create Service - MedQueue" />

            <div className="max-w-2xl mx-auto">
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Department Selection */}
                        <div>
                            <InputLabel htmlFor="department_id" value="Assigned Department *" />
                            <SelectInput
                                id="department_id"
                                value={data.department_id}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setData('department_id', e.target.value)}
                                className="mt-1 block w-full"
                                required
                                options={departments.map((d) => ({
                                    value: d.id,
                                    label: `${d.code} - ${d.name}`,
                                }))}
                            />
                            <InputError message={errors.department_id} className="mt-1" />
                        </div>

                        {/* Service Code & Prefix (Grid) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="code" value="Service Code *" />
                                <TextInput
                                    id="code"
                                    type="text"
                                    value={data.code}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData('code', e.target.value.toUpperCase())}
                                    className="mt-1 block w-full uppercase font-mono tracking-wider"
                                    placeholder="e.g. OPD-GEN, LAB-SPEC"
                                    required
                                />
                                <p className="mt-1 text-xs text-slate-500">Unique internal identifier.</p>
                                <InputError message={errors.code} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="prefix" value="Queue Ticket Prefix *" />
                                <TextInput
                                    id="prefix"
                                    type="text"
                                    value={data.prefix}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData('prefix', e.target.value.toUpperCase())}
                                    className="mt-1 block w-full uppercase font-mono tracking-widest font-bold"
                                    placeholder="e.g. A, B, P, LAB"
                                    maxLength={10}
                                    required
                                />
                                <p className="mt-1 text-xs text-slate-500">Prefix for ticket numbers (e.g. A001).</p>
                                <InputError message={errors.prefix} className="mt-1" />
                            </div>
                        </div>

                        {/* Service Name */}
                        <div>
                            <InputLabel htmlFor="name" value="Service Name *" />
                            <TextInput
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="e.g. General Consultation, Follow-up Visit, Specimen Collection"
                                required
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>

                        {/* Description */}
                        <div>
                            <InputLabel htmlFor="description" value="Description (Optional)" />
                            <TextArea
                                id="description"
                                value={data.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Service description or eligibility instructions..."
                                rows={3}
                            />
                            <InputError message={errors.description} className="mt-1" />
                        </div>

                        {/* Active Status */}
                        <div className="pt-2 border-t border-slate-100">
                            <ToggleSwitch
                                checked={data.is_active}
                                onChange={(checked: boolean) => setData('is_active', checked)}
                                label="Active Status"
                                description="Enable this service for active queue ticketing."
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                            <Link href={route('services.index')}>
                                <SecondaryButton type="button">Cancel</SecondaryButton>
                            </Link>
                            <PrimaryButton type="submit" disabled={processing}>
                                {processing ? 'Creating Service...' : 'Save Service'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}


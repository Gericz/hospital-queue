import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import SecondaryButton from '@/Components/SecondaryButton';

interface Service {
    id: number;
    code: string;
    name: string;
    prefix: string;
    description: string | null;
    is_active: boolean;
    department?: {
        id: number;
        name: string;
        code: string;
    };
}

export default function Show({ service }: { service: Service }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                            {service.name} ({service.code})
                        </h2>
                    </div>
                    <Link href={route('services.index')}>
                        <SecondaryButton>Back to Services</SecondaryButton>
                    </Link>
                </div>
            }
        >
            <Head title={`${service.name} - MedQueue`} />
            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Ticket Prefix</span>
                            <div className="text-xl font-bold font-mono text-teal-600">{service.prefix}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Department</span>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{service.department?.name}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Status</span>
                            <div className="mt-1"><StatusBadge status={service.is_active} /></div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Description</span>
                            <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{service.description || 'No description provided.'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}


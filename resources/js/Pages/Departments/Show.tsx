import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import SecondaryButton from '@/Components/SecondaryButton';

interface Department {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    services: any[];
    windows: any[];
}

export default function Show({ department }: { department: Department }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                            {department.name} ({department.code})
                        </h2>
                    </div>
                    <Link href={route('departments.index')}>
                        <SecondaryButton>Back to Departments</SecondaryButton>
                    </Link>
                </div>
            }
        >
            <Head title={`${department.name} - MedQueue`} />
            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Department Code</span>
                            <div className="text-xl font-bold text-teal-600">{department.code}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Status</span>
                            <div className="mt-1"><StatusBadge status={department.is_active} /></div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Description</span>
                            <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{department.description || 'No description provided.'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}


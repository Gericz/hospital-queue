import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import SecondaryButton from '@/Components/SecondaryButton';

interface Window {
    id: number;
    window_number: string;
    name: string;
    is_active: boolean;
    department?: {
        id: number;
        name: string;
        code: string;
    };
}

export default function Show({ window }: { window: Window }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                            {window.name} (Counter #{window.window_number})
                        </h2>
                    </div>
                    <Link href={route('windows.index')}>
                        <SecondaryButton>Back to Windows</SecondaryButton>
                    </Link>
                </div>
            }
        >
            <Head title={`${window.name} - MedQueue`} />
            <div className="py-6 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Counter Number</span>
                            <div className="text-xl font-bold font-mono text-teal-600">#{window.window_number}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Department</span>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{window.department?.name}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-semibold">Status</span>
                            <div className="mt-1"><StatusBadge status={window.is_active} /></div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}


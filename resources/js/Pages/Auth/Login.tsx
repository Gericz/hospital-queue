import React, { FormEventHandler } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword?: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const fillCredentials = (email: string) => {
        setData({
            email,
            password: 'password',
            remember: true,
        });
    };

    return (
        <GuestLayout>
            <Head title="Staff Sign In - MedQueue" />

            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Staff Sign In</h2>
                <p className="text-xs text-slate-500 mt-1">
                    Enter your hospital staff credentials to access your terminal
                </p>
            </div>

            {status && (
                <div className="my-4 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                    <InputLabel htmlFor="email" value="Hospital Staff Email" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        placeholder="staff@medqueue.local"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <InputError message={errors.email} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Password" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} className="mt-1" />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center cursor-pointer select-none">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="ms-2 text-slate-600 font-medium">Keep me signed in</span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-teal-600 hover:text-teal-800 font-semibold"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

                <div className="pt-2">
                    <PrimaryButton
                        className="w-full justify-center py-3 text-sm font-bold shadow-md shadow-teal-600/20"
                        disabled={processing}
                    >
                        {processing ? 'Signing In...' : 'Sign In to MedQueue'}
                    </PrimaryButton>
                </div>
            </form>

            {/* Quick Demo Fill Credentials for Development */}
            <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Development Quick Login:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                        type="button"
                        onClick={() => fillCredentials('admin@medqueue.local')}
                        className="text-left px-2.5 py-1.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 transition font-medium text-slate-700 truncate"
                        title="Super Administrator (admin@medqueue.local)"
                    >
                        🛡️ Super Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => fillCredentials('hospital_admin@medqueue.local')}
                        className="text-left px-2.5 py-1.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 transition font-medium text-slate-700 truncate"
                        title="Hospital Administrator (hospital_admin@medqueue.local)"
                    >
                        👨‍⚕️ Hospital Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => fillCredentials('queue_admin@medqueue.local')}
                        className="text-left px-2.5 py-1.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 transition font-medium text-slate-700 truncate"
                        title="Queue Administrator (queue_admin@medqueue.local)"
                    >
                        📋 Queue Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => fillCredentials('opd_staff@medqueue.local')}
                        className="text-left px-2.5 py-1.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 transition font-medium text-slate-700 truncate"
                        title="Queue Staff (opd_staff@medqueue.local)"
                    >
                        🎫 Queue Staff
                    </button>
                </div>
            </div>
        </GuestLayout>
    );
}


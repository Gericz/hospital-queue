import React, { PropsWithChildren } from 'react';
import { Link } from '@inertiajs/react';
import HospitalLogo from '@/Components/HospitalLogo';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-4 sm:p-6 text-slate-800">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <Link href="/">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
                            <HospitalLogo size="md" className="brightness-110" />
                        </div>
                    </Link>
                </div>

                <div className="w-full overflow-hidden bg-white/95 backdrop-blur-sm px-6 py-8 shadow-2xl rounded-2xl border border-white/20">
                    {children}
                </div>

                <div className="mt-6 text-center text-xs text-slate-400">
                    <p>MedQueue Hospital Queue & Patient Flow System</p>
                    <p className="text-[11px] text-slate-500 mt-1">Hospital Local Server Instance &bull; Secure Authentication</p>
                </div>
            </div>
        </div>
    );
}


import React from 'react';

interface HospitalLogoProps {
    className?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function HospitalLogo({ className = '', showText = true, size = 'md' }: HospitalLogoProps) {
    const iconSizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const textSizes = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
    };

    return (
        <div className={`flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-white ${className}`}>
            <div className={`flex items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm shadow-teal-500/20 ${iconSizes[size]}`}>
                <svg className="w-3/5 h-3/5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
                </svg>
            </div>
            {showText && (
                <div className="flex flex-col leading-tight">
                    <span className={`${textSizes[size]} font-extrabold text-teal-700 dark:text-teal-400 tracking-wider`}>
                        MED<span className="text-slate-800 dark:text-white">QUEUE</span>
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-widest -mt-0.5">
                        Hospital Flow
                    </span>
                </div>
            )}
        </div>
    );
}

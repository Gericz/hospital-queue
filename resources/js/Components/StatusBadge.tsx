import React from 'react';

export interface StatusBadgeProps {
    status?: boolean | string;
    isActive?: boolean;
    activeText?: string;
    inactiveText?: string;
    size?: 'sm' | 'md';
}

export default function StatusBadge({
    status,
    isActive: isActiveProp,
    activeText = 'Active',
    inactiveText = 'Inactive',
    size = 'md',
}: StatusBadgeProps) {
    const isActive = isActiveProp !== undefined
        ? isActiveProp
        : typeof status === 'boolean'
        ? status
        : typeof status === 'string'
        ? status.toLowerCase() === 'active'
        : false;

    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

    if (isActive) {
        return (
            <span
                className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/30 ${sizeClasses}`}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeText}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700 ${sizeClasses}`}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {inactiveText}
        </span>
    );
}

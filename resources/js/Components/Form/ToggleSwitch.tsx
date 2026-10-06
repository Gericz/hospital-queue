import React from 'react';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    id?: string;
}

export default function ToggleSwitch({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    id,
}: ToggleSwitchProps) {
    const generatedId = id || (label ? `toggle-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

    return (
        <div className="flex items-start justify-between gap-4">
            {(label || description) && (
                <div className="flex flex-col">
                    {label && (
                        <label
                            htmlFor={generatedId}
                            className={`text-sm font-semibold text-slate-700 dark:text-slate-200 ${
                                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        >
                            {label}
                        </label>
                    )}
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <button
                type="button"
                id={generatedId}
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                    checked ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className="sr-only">{label || 'Toggle switch'}</span>
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}


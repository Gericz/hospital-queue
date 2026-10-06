import React, { SelectHTMLAttributes, forwardRef } from 'react';

interface Option {
    value: string | number;
    label: string;
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options?: Option[];
    placeholder?: string;
    isFocused?: boolean;
}

export default forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
    { className = '', options = [], placeholder, children, ...props },
    ref
) {
    return (
        <select
            {...props}
            ref={ref}
            className={
                'rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-teal-600 dark:focus:ring-teal-600 sm:text-sm ' +
                className
            }
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
            {children}
        </select>
    );
});

import React, { TextareaHTMLAttributes, forwardRef } from 'react';

export default forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
    function TextArea({ className = '', ...props }, ref) {
        return (
            <textarea
                {...props}
                ref={ref}
                className={
                    'rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-teal-600 dark:focus:ring-teal-600 sm:text-sm ' +
                    className
                }
            />
        );
    }
);

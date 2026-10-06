import React, { ReactNode } from 'react';
import { Link } from '@inertiajs/react';

export interface Column<T> {
    header: string;
    accessor?: keyof T | ((item: T) => ReactNode);
    className?: string;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    pagination?: {
        links: PaginationLink[];
        from: number;
        to: number;
        total: number;
    };
    emptyMessage?: string;
}

export default function DataTable<T extends { id: number | string }>({
    columns,
    data,
    pagination,
    emptyMessage = 'No records found.',
}: DataTableProps<T>) {
    return (
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 sm:rounded-xl">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/80">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className={`py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 sm:pl-6 ${col.className ?? ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition-colors">
                                    {columns.map((col, cIdx) => (
                                        <td
                                            key={cIdx}
                                            className={`whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-700 dark:text-slate-200 sm:pl-6 ${col.className ?? ''}`}
                                        >
                                            {typeof col.accessor === 'function'
                                                ? col.accessor(item)
                                                : col.accessor
                                                ? (item[col.accessor] as unknown as ReactNode)
                                                : null}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && pagination.links.length > 3 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        {pagination.links[0]?.url ? (
                            <Link
                                href={pagination.links[0].url}
                                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Previous
                            </Link>
                        ) : <span />}
                        {pagination.links[pagination.links.length - 1]?.url ? (
                            <Link
                                href={pagination.links[pagination.links.length - 1].url!}
                                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Next
                            </Link>
                        ) : <span />}
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                Showing <span className="font-semibold">{pagination.from ?? 0}</span> to{' '}
                                <span className="font-semibold">{pagination.to ?? 0}</span> of{' '}
                                <span className="font-semibold">{pagination.total}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                {pagination.links.map((link, i) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={i}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-400 dark:text-slate-600 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 cursor-default"
                                            />
                                        );
                                    }
                                    return (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:z-20 ${
                                                link.active
                                                    ? 'z-10 bg-teal-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ring-teal-600'
                                                    : 'text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        />
                                    );
                                })}
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

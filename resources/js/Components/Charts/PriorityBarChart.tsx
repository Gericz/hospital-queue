import React from 'react';

interface PriorityItem {
    priority_type: string;
    label: string;
    total: number;
    completed: number;
    skipped: number;
    cancelled: number;
    completion_rate: number;
    avg_wait_seconds: number;
    avg_service_seconds: number;
}

interface PriorityBarChartProps {
    data: PriorityItem[];
}

export default function PriorityBarChart({ data }: PriorityBarChartProps) {
    const formatMinutes = (sec: number) => `${Math.round(sec / 60)} min`;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Priority Lane Performance</h3>
                <p className="text-xs text-slate-500">Volume and wait/service benchmarks per priority class</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                            <th className="pb-2">Priority Category</th>
                            <th className="pb-2 text-right">Volume</th>
                            <th className="pb-2 text-right">Completed</th>
                            <th className="pb-2 text-right">Avg Wait</th>
                            <th className="pb-2 text-right">Avg Service</th>
                            <th className="pb-2 text-right">Completion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {data.map((item) => (
                            <tr key={item.priority_type} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                                <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            item.priority_type === 'emergency'
                                                ? 'bg-rose-500'
                                                : item.priority_type === 'senior'
                                                ? 'bg-amber-500'
                                                : item.priority_type === 'pwd'
                                                ? 'bg-blue-500'
                                                : item.priority_type === 'pregnant'
                                                ? 'bg-pink-500'
                                                : 'bg-teal-500'
                                        }`}
                                    />
                                    {item.label}
                                </td>
                                <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                                    {item.total}
                                </td>
                                <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {item.completed}
                                </td>
                                <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">
                                    {item.avg_wait_seconds > 0 ? formatMinutes(item.avg_wait_seconds) : '—'}
                                </td>
                                <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">
                                    {item.avg_service_seconds > 0 ? formatMinutes(item.avg_service_seconds) : '—'}
                                </td>
                                <td className="py-2.5 text-right">
                                    <span
                                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                            item.completion_rate >= 80
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        }`}
                                    >
                                        {item.completion_rate}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

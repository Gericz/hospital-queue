import React from 'react';

interface SlaItem {
    service_id: number;
    service_name: string;
    department_name: string;
    target_wait_minutes: number | null;
    target_configured: boolean;
    actual_avg_wait_seconds: number;
    total_called: number;
    within_target: number | null;
    exceeding_target: number | null;
    compliance_percentage: number | null;
}

interface SlaComplianceCardProps {
    data: SlaItem[];
}

export default function SlaComplianceCard({ data }: SlaComplianceCardProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">SLA & Wait-Time Target Compliance</h3>
                    <p className="text-xs text-slate-500">Operational performance indicators against hospital targets</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                    SLA Tracking
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                            <th className="pb-2">Clinical Service</th>
                            <th className="pb-2">Department</th>
                            <th className="pb-2 text-right">Target Wait</th>
                            <th className="pb-2 text-right">Actual Avg</th>
                            <th className="pb-2 text-right">Called</th>
                            <th className="pb-2 text-right">Within Target</th>
                            <th className="pb-2 text-right">Compliance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {data.map((item) => (
                            <tr key={item.service_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                                <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                                    {item.service_name}
                                </td>
                                <td className="py-3 text-slate-500">{item.department_name}</td>
                                <td className="py-3 text-right font-medium">
                                    {item.target_configured ? (
                                        <span className="text-teal-600 dark:text-teal-400 font-bold">
                                            {item.target_wait_minutes} min
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 italic">Not configured</span>
                                    )}
                                </td>
                                <td className="py-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                                    {item.actual_avg_wait_seconds > 0
                                        ? `${Math.round(item.actual_avg_wait_seconds / 60)} min`
                                        : '—'}
                                </td>
                                <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                                    {item.total_called}
                                </td>
                                <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                                    {item.within_target !== null ? item.within_target : '—'}
                                </td>
                                <td className="py-3 text-right">
                                    {item.compliance_percentage !== null ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        item.compliance_percentage >= 80
                                                            ? 'bg-emerald-500'
                                                            : item.compliance_percentage >= 50
                                                            ? 'bg-amber-500'
                                                            : 'bg-rose-500'
                                                    }`}
                                                    style={{ width: `${item.compliance_percentage}%` }}
                                                />
                                            </div>
                                            <span
                                                className={`font-bold text-[11px] ${
                                                    item.compliance_percentage >= 80
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : item.compliance_percentage >= 50
                                                        ? 'text-amber-600 dark:text-amber-400'
                                                        : 'text-rose-600 dark:text-rose-400'
                                                }`}
                                            >
                                                {item.compliance_percentage}%
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

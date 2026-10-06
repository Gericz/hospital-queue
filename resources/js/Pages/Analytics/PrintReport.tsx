import React from 'react';
import { Head } from '@inertiajs/react';
import HospitalLogo from '@/Components/HospitalLogo';
import { Printer, ArrowLeft } from 'lucide-react';

interface PrintReportProps {
    reportType: string;
    filters: any;
    dates: {
        start_date: string;
        end_date: string;
        preset: string;
    };
    summary: any;
    departmentPerformance: any[];
    servicePerformance: any[];
    windowPerformance: any[];
    slaCompliance: any[];
    priorityAnalytics: any[];
    waitTimeDistribution: any[];
    generatedBy: string;
    generatedAt: string;
}

export default function PrintReport({
    reportType,
    dates,
    summary,
    departmentPerformance,
    servicePerformance,
    windowPerformance,
    slaCompliance,
    priorityAnalytics,
    waitTimeDistribution,
    generatedBy,
    generatedAt,
}: PrintReportProps) {
    const formatMinutes = (sec: number) => {
        if (!sec || sec <= 0) return '0 min';
        return `${Math.round(sec / 60)} min`;
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8 print:p-0 print:bg-white">
            <Head title="Hospital Queue Performance Report — MedQueue" />

            {/* Action Bar (Hidden when printing) */}
            <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between print:hidden">
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 shadow-sm transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>
                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md transition"
                >
                    <Printer className="w-4 h-4" />
                    Print / Save as PDF
                </button>
            </div>

            {/* Report Document Sheet */}
            <div className="max-w-5xl mx-auto bg-white p-10 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-4">
                        <HospitalLogo size="md" />
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">MedQueue Hospital Management</h1>
                            <p className="text-xs text-slate-500">Official Queue & Patient Flow Operational Performance Report</p>
                        </div>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                        <div className="font-bold text-slate-800">CONFIDENTIAL OPERATIONAL AUDIT</div>
                        <div className="text-slate-500">Generated: {generatedAt}</div>
                        <div className="text-slate-500">Officer: {generatedBy}</div>
                    </div>
                </div>

                {/* Report Metadata */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-xs">
                    <div>
                        <span className="text-slate-400 uppercase font-bold text-[10px]">Reporting Period</span>
                        <div className="font-bold text-slate-800">{dates.start_date} to {dates.end_date}</div>
                    </div>
                    <div>
                        <span className="text-slate-400 uppercase font-bold text-[10px]">Filter Scope</span>
                        <div className="font-bold text-slate-800 uppercase">{dates.preset.replace('_', ' ')}</div>
                    </div>
                    <div>
                        <span className="text-slate-400 uppercase font-bold text-[10px]">Report Classification</span>
                        <div className="font-bold text-teal-700">{reportType.toUpperCase().replace('_', ' ')}</div>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="space-y-3">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                        1. Executive Queue Summary
                    </h2>
                    <div className="grid grid-cols-4 gap-4 text-xs">
                        <div className="border border-slate-200 p-3 rounded-lg">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Total Issued Tickets</span>
                            <div className="text-xl font-black text-slate-900">{summary.total_tickets}</div>
                        </div>
                        <div className="border border-slate-200 p-3 rounded-lg">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Total Completed</span>
                            <div className="text-xl font-black text-emerald-600">{summary.total_completed} ({summary.completion_rate}%)</div>
                        </div>
                        <div className="border border-slate-200 p-3 rounded-lg">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Avg Patient Wait</span>
                            <div className="text-xl font-black text-teal-600">{formatMinutes(summary.avg_wait_seconds)}</div>
                        </div>
                        <div className="border border-slate-200 p-3 rounded-lg">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Avg Service Duration</span>
                            <div className="text-xl font-black text-blue-600">{formatMinutes(summary.avg_service_seconds)}</div>
                        </div>
                    </div>
                </div>

                {/* Department Performance */}
                <div className="space-y-3">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                        2. Department Performance
                    </h2>
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                            <tr>
                                <th className="p-2.5">Code</th>
                                <th className="p-2.5">Department</th>
                                <th className="p-2.5 text-right">Tickets</th>
                                <th className="p-2.5 text-right">Completed</th>
                                <th className="p-2.5 text-right">Skipped</th>
                                <th className="p-2.5 text-right">Avg Wait</th>
                                <th className="p-2.5 text-right">Avg Service</th>
                                <th className="p-2.5 text-right">Completion %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {departmentPerformance.map((dept) => (
                                <tr key={dept.department_id}>
                                    <td className="p-2.5 font-bold">{dept.code}</td>
                                    <td className="p-2.5">{dept.name}</td>
                                    <td className="p-2.5 text-right font-semibold">{dept.total_tickets}</td>
                                    <td className="p-2.5 text-right">{dept.completed}</td>
                                    <td className="p-2.5 text-right">{dept.skipped}</td>
                                    <td className="p-2.5 text-right">{formatMinutes(dept.avg_wait_seconds)}</td>
                                    <td className="p-2.5 text-right">{formatMinutes(dept.avg_service_seconds)}</td>
                                    <td className="p-2.5 text-right font-bold">{dept.completion_rate}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Service Performance & SLA */}
                <div className="space-y-3">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                        3. Clinical Service SLA Compliance
                    </h2>
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                            <tr>
                                <th className="p-2.5">Service</th>
                                <th className="p-2.5">Department</th>
                                <th className="p-2.5 text-right">Target Wait</th>
                                <th className="p-2.5 text-right">Actual Avg</th>
                                <th className="p-2.5 text-right">Total Called</th>
                                <th className="p-2.5 text-right">Within Target</th>
                                <th className="p-2.5 text-right">Compliance %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {slaCompliance.map((item) => (
                                <tr key={item.service_id}>
                                    <td className="p-2.5 font-bold">{item.service_name}</td>
                                    <td className="p-2.5 text-slate-500">{item.department_name}</td>
                                    <td className="p-2.5 text-right font-semibold">
                                        {item.target_configured ? `${item.target_wait_minutes} min` : 'Not Configured'}
                                    </td>
                                    <td className="p-2.5 text-right">{formatMinutes(item.actual_avg_wait_seconds)}</td>
                                    <td className="p-2.5 text-right">{item.total_called}</td>
                                    <td className="p-2.5 text-right">{item.within_target ?? '—'}</td>
                                    <td className="p-2.5 text-right font-bold text-teal-700">
                                        {item.compliance_percentage !== null ? `${item.compliance_percentage}%` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Notes & Signatures */}
                <div className="border-t border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-12 text-xs">
                    <div className="space-y-1 text-slate-500">
                        <p className="font-bold text-slate-700">Data Protection Note:</p>
                        <p>This report contains aggregated operational statistics only. No patient personally identifiable information (PII) is published in accordance with medical data privacy guidelines.</p>
                    </div>
                    <div className="space-y-8 text-right">
                        <div className="text-slate-500">Prepared By: ___________________________________</div>
                        <div className="text-slate-500">Approved By: ___________________________________</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

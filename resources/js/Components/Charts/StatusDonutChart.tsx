import React from 'react';

interface StatusItem {
    status: string;
    label: string;
    count: number;
    percentage: number;
}

interface StatusDonutChartProps {
    data: StatusItem[];
}

const statusColors: Record<string, string> = {
    completed: '#10b981', // emerald
    skipped: '#f59e0b',   // amber
    cancelled: '#ef4444', // rose
    transferred: '#8b5cf6', // purple
    hold: '#6366f1',      // indigo
    serving: '#3b82f6',   // blue
    called: '#06b6d4',    // cyan
    waiting: '#94a3b8',   // slate
};

export default function StatusDonutChart({ data }: StatusDonutChartProps) {
    const total = data.reduce((acc, curr) => acc + curr.count, 0);

    // Filter items with count > 0 for chart segments
    const activeItems = data.filter((d) => d.count > 0);

    // Calculate donut segments
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Status Distribution</h3>
                <p className="text-xs text-slate-500">Breakdown of queue outcomes & states</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-4">
                {/* SVG Donut */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                        {/* Background Ring */}
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            className="text-slate-100 dark:text-slate-700"
                            strokeWidth="20"
                        />

                        {/* Segment Rings */}
                        {activeItems.map((item) => {
                            const ratio = total > 0 ? item.count / total : 0;
                            const strokeDasharray = `${ratio * circumference} ${circumference}`;
                            const strokeDashoffset = -accumulatedOffset;
                            accumulatedOffset += ratio * circumference;

                            return (
                                <circle
                                    key={item.status}
                                    cx="80"
                                    cy="80"
                                    r={radius}
                                    fill="none"
                                    stroke={statusColors[item.status] || '#94a3b8'}
                                    strokeWidth="20"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-300"
                                />
                            );
                        })}
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-50">{total}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Tickets</span>
                    </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {data.map((item) => (
                        <div key={item.status} className="flex items-center gap-2">
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: statusColors[item.status] || '#94a3b8' }}
                            />
                            <div className="flex flex-col">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                    {item.label}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                    {item.count} ({item.percentage}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

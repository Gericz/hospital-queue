import React, { useState } from 'react';

interface VolumeDataPoint {
    period: string;
    total: number;
    completed: number;
    skipped: number;
    cancelled: number;
    transferred: number;
}

interface VolumeChartProps {
    data: VolumeDataPoint[];
    title?: string;
}

export default function VolumeChart({ data, title = 'Queue Volume Over Time' }: VolumeChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h3>
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No queue activity recorded for this period.
                </div>
            </div>
        );
    }

    const maxVal = Math.max(...data.map((d) => d.total), 5);
    const chartHeight = 220;
    const chartWidth = 700;
    const paddingX = 40;
    const paddingY = 30;

    const availableWidth = chartWidth - paddingX * 2;
    const availableHeight = chartHeight - paddingY * 2;

    const barWidth = Math.min(Math.max(availableWidth / data.length - 8, 8), 36);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                    <p className="text-xs text-slate-500">Total, completed, and skipped volume breakdown</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />
                        <span className="text-slate-600 dark:text-slate-300">Total</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                        <span className="text-slate-600 dark:text-slate-300">Completed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                        <span className="text-slate-600 dark:text-slate-300">Skipped</span>
                    </div>
                </div>
            </div>

            <div className="relative overflow-x-auto">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-64 overflow-visible font-sans text-xs"
                >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = paddingY + availableHeight * (1 - ratio);
                        const val = Math.round(maxVal * ratio);
                        return (
                            <g key={ratio}>
                                <line
                                    x1={paddingX}
                                    y1={y}
                                    x2={chartWidth - paddingX}
                                    y2={y}
                                    stroke="currentColor"
                                    className="text-slate-100 dark:text-slate-700"
                                    strokeDasharray="4 4"
                                />
                                <text
                                    x={paddingX - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    className="fill-slate-400 text-[10px]"
                                >
                                    {val}
                                </text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {data.map((d, index) => {
                        const step = availableWidth / data.length;
                        const x = paddingX + index * step + (step - barWidth) / 2;
                        const totalHeight = (d.total / maxVal) * availableHeight;
                        const completedHeight = (d.completed / maxVal) * availableHeight;
                        const yTotal = paddingY + availableHeight - totalHeight;
                        const yCompleted = paddingY + availableHeight - completedHeight;

                        const isHovered = hoveredIndex === index;

                        return (
                            <g
                                key={d.period}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="cursor-pointer transition-all"
                            >
                                {/* Total bar (background) */}
                                <rect
                                    x={x}
                                    y={yTotal}
                                    width={barWidth}
                                    height={Math.max(totalHeight, 2)}
                                    rx={4}
                                    className={`fill-teal-500/30 dark:fill-teal-500/20 transition ${isHovered ? 'fill-teal-500/50' : ''}`}
                                />

                                {/* Completed bar (overlay) */}
                                <rect
                                    x={x}
                                    y={yCompleted}
                                    width={barWidth}
                                    height={Math.max(completedHeight, 2)}
                                    rx={4}
                                    className={`fill-teal-600 dark:fill-teal-500 transition ${isHovered ? 'brightness-110' : ''}`}
                                />

                                {/* Period Label on X axis */}
                                <text
                                    x={x + barWidth / 2}
                                    y={chartHeight - 8}
                                    textAnchor="middle"
                                    className={`fill-slate-500 dark:fill-slate-400 text-[10px] font-medium ${
                                        isHovered ? 'font-bold fill-teal-600 dark:fill-teal-400' : ''
                                    }`}
                                >
                                    {d.period.length > 5 ? d.period.slice(-5) : d.period}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Hover Tooltip */}
                {hoveredIndex !== null && data[hoveredIndex] && (
                    <div className="mt-2 text-xs bg-slate-900 text-white rounded-xl p-3 shadow-lg flex items-center justify-between border border-slate-700">
                        <span className="font-bold text-teal-400">{data[hoveredIndex].period}</span>
                        <div className="flex gap-4">
                            <span>Total: <strong className="text-white">{data[hoveredIndex].total}</strong></span>
                            <span>Completed: <strong className="text-emerald-400">{data[hoveredIndex].completed}</strong></span>
                            <span>Skipped: <strong className="text-amber-400">{data[hoveredIndex].skipped}</strong></span>
                            <span>Cancelled: <strong className="text-rose-400">{data[hoveredIndex].cancelled}</strong></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

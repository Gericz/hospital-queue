import React, { useState } from 'react';

interface HourlyDataPoint {
    hour: number;
    label: string;
    range: string;
    count: number;
    completed: number;
}

interface HourlyTrafficChartProps {
    data: {
        hours: HourlyDataPoint[];
        peak_hour: string;
        lowest_hour: string;
        avg_hourly_volume: number;
        total_volume: number;
    };
}

export default function HourlyTrafficChart({ data }: HourlyTrafficChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const hours = data.hours || [];
    const maxVal = Math.max(...hours.map((h) => h.count), 5);
    const chartHeight = 200;
    const chartWidth = 700;
    const paddingX = 40;
    const paddingY = 25;

    const availableWidth = chartWidth - paddingX * 2;
    const availableHeight = chartHeight - paddingY * 2;
    const barWidth = Math.min(Math.max(availableWidth / Math.max(hours.length, 1) - 6, 6), 24);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Hourly Traffic Analysis</h3>
                    <p className="text-xs text-slate-500">Patient arrival distribution across operational hours (06:00 – 20:00)</p>
                </div>
                <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-500">Peak: <strong className="text-teal-600 dark:text-teal-400">{data.peak_hour}</strong></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Avg/Hr: <strong className="text-slate-800 dark:text-slate-200">{data.avg_hourly_volume}</strong></span>
                </div>
            </div>

            <div className="relative overflow-x-auto">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-56 overflow-visible font-sans text-xs"
                >
                    {/* Grid lines */}
                    {[0, 0.5, 1].map((ratio) => {
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
                    {hours.map((h, index) => {
                        const step = availableWidth / hours.length;
                        const x = paddingX + index * step + (step - barWidth) / 2;
                        const height = (h.count / maxVal) * availableHeight;
                        const y = paddingY + availableHeight - height;
                        const isHovered = hoveredIndex === index;
                        const isPeak = h.count === maxVal && maxVal > 0;

                        return (
                            <g
                                key={h.hour}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="cursor-pointer transition-all"
                            >
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(height, 2)}
                                    rx={3}
                                    className={`transition-all duration-200 ${
                                        isPeak
                                            ? 'fill-amber-500 hover:fill-amber-400'
                                            : isHovered
                                            ? 'fill-teal-500'
                                            : 'fill-teal-600/70 dark:fill-teal-500/60'
                                    }`}
                                />

                                {/* Hour Label */}
                                <text
                                    x={x + barWidth / 2}
                                    y={chartHeight - 6}
                                    textAnchor="middle"
                                    className={`fill-slate-400 dark:fill-slate-500 text-[9px] ${
                                        isHovered || isPeak ? 'font-bold fill-teal-600 dark:fill-teal-400' : ''
                                    }`}
                                >
                                    {h.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Hover Details */}
                {hoveredIndex !== null && hours[hoveredIndex] && (
                    <div className="mt-2 text-xs bg-slate-900 text-white rounded-xl p-2.5 shadow-lg flex items-center justify-between border border-slate-700">
                        <span className="font-bold text-teal-400">{hours[hoveredIndex].range}</span>
                        <div className="flex gap-4">
                            <span>Arrivals: <strong className="text-white">{hours[hoveredIndex].count}</strong></span>
                            <span>Completed: <strong className="text-emerald-400">{hours[hoveredIndex].completed}</strong></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

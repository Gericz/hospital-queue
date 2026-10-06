import React from 'react';

interface WaitTimeBucket {
    key: string;
    label: string;
    count: number;
    percentage: number;
}

interface WaitTimeHistogramProps {
    data: WaitTimeBucket[];
}

export default function WaitTimeHistogram({ data }: WaitTimeHistogramProps) {
    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Waiting Time Distribution</h3>
                <p className="text-xs text-slate-500">Patient distribution across wait-time duration tiers</p>
            </div>

            <div className="space-y-3">
                {data.map((bucket) => {
                    const widthPercent = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                    const isLongWait = bucket.key === 'between_60_120_min' || bucket.key === 'over_120_min';

                    return (
                        <div key={bucket.key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-slate-700 dark:text-slate-300">{bucket.label}</span>
                                <span className="text-slate-500">
                                    <strong className="text-slate-800 dark:text-slate-100">{bucket.count}</strong> tickets ({bucket.percentage}%)
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        isLongWait && bucket.count > 0
                                            ? 'bg-amber-500'
                                            : 'bg-teal-500'
                                    }`}
                                    style={{ width: `${Math.max(widthPercent, bucket.count > 0 ? 3 : 0)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

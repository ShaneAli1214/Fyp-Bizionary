import React from 'react';

const base = 'animate-pulse bg-active-pill dark:bg-slate-700 rounded';

const Line = ({ width = 'w-full', height = 'h-4', className = '' }) => (
    <div className={`${base} ${width} ${height} ${className}`} />
);

const Block = ({ height = 'h-24', className = '' }) => (
    <div className={`${base} w-full ${height} ${className}`} />
);

const Circle = ({ size = 'w-10 h-10', className = '' }) => (
    <div className={`${base} rounded-full ${size} ${className}`} />
);

const TableRows = ({ count = 5, cols = 4 }) => (
    <div className="w-full overflow-hidden">
        {/* thead placeholder */}
        <div className="flex gap-4 px-6 py-3 border-b border-card dark:border-slate-800">
            {Array.from({ length: cols }).map((_, i) => (
                <div key={i} className={`${base} h-3 ${i === 0 ? 'w-24' : 'flex-1'}`} />
            ))}
        </div>
        {/* rows */}
        {Array.from({ length: count }).map((_, r) => (
            <div key={r} className="flex gap-4 px-6 py-4 border-b border-gray-50 dark:border-slate-800/60">
                {Array.from({ length: cols }).map((_, c) => (
                    <div key={c} className={`${base} h-4 ${c === 0 ? 'w-28' : 'flex-1'}`} />
                ))}
            </div>
        ))}
    </div>
);

const KPICard = () => (
    <div className="bg-surface rounded-2xl border border-card dark:border-slate-800/60 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
            <div className={`${base} h-3 w-24`} />
            <div className={`${base} rounded-xl w-8 h-8`} />
        </div>
        <div className={`${base} h-7 w-32`} />
        <div className={`${base} h-3 w-20`} />
    </div>
);

const Skeleton = { Line, Block, Circle, TableRows, KPICard };

export default Skeleton;

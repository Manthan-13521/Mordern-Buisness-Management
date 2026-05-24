import React from "react";
import clsx from "clsx";

export function SASkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={clsx(
                "animate-pulse bg-[var(--sa-border-subtle)] rounded-lg",
                className
            )}
            {...props}
        />
    );
}

export function SACardSkeleton() {
    return (
        <div className="bg-[var(--sa-bg-card)] border border-[var(--sa-border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
                <SASkeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                    <SASkeleton className="h-4 w-1/3" />
                    <SASkeleton className="h-3 w-1/4" />
                </div>
            </div>
            <div className="space-y-3">
                <SASkeleton className="h-3 w-full" />
                <SASkeleton className="h-3 w-5/6" />
                <SASkeleton className="h-3 w-4/6" />
            </div>
        </div>
    );
}

export function SATableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-[var(--sa-bg-card)] border border-[var(--sa-border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-[var(--sa-border)] bg-[var(--sa-bg)] flex">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="flex-1 px-6 py-4">
                        <SASkeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
            <div>
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="border-b border-[var(--sa-border-subtle)] flex">
                        {Array.from({ length: cols }).map((_, c) => (
                            <div key={c} className="flex-1 px-6 py-4">
                                <SASkeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

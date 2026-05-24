import React from "react";
import clsx from "clsx";

export function SAPageHeader({
    title,
    description,
    actions,
    icon
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="p-2 bg-[var(--sa-accent-muted)] text-[var(--sa-accent)] rounded-lg">
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--sa-text-primary)]">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-[var(--sa-text-muted)] mt-1 text-sm sm:text-base font-medium">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-3 shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}

import React from "react";
import { FolderSearch } from "lucide-react";

export function SAEmptyState({
    title,
    description,
    action,
    icon
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-[var(--sa-border)] rounded-2xl bg-[var(--sa-bg-card)]">
            <div className="w-12 h-12 bg-[var(--sa-bg-elevated)] rounded-full flex items-center justify-center text-[var(--sa-text-muted)] mb-4">
                {icon || <FolderSearch className="w-6 h-6" />}
            </div>
            <h3 className="text-lg font-bold text-[var(--sa-text-primary)] mb-1">{title}</h3>
            <p className="text-[var(--sa-text-muted)] text-sm max-w-sm mx-auto mb-6">
                {description}
            </p>
            {action}
        </div>
    );
}

import React from "react";
import clsx from "clsx";

interface SATableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    containerClassName?: string;
}

export function SATableContainer({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={clsx(
            "bg-[var(--sa-bg-card)] border border-[var(--sa-border)] rounded-2xl shadow-sm overflow-hidden",
            className
        )}>
            <div className="overflow-x-auto custom-scrollbar">
                {children}
            </div>
        </div>
    );
}

export function SATable({ children, className, containerClassName, ...props }: SATableProps) {
    return (
        <table className={clsx("w-full text-sm", className)} {...props}>
            {children}
        </table>
    );
}

export function SATHead({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead className={clsx("border-b border-[var(--sa-border)] bg-[var(--sa-bg)]", className)} {...props}>
            {children}
        </thead>
    );
}

export function SATH({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th className={clsx(
            "text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--sa-text-muted)] whitespace-nowrap",
            className
        )} {...props}>
            {children}
        </th>
    );
}

export function SATBody({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody className={clsx("divide-y divide-[var(--sa-border-subtle)]", className)} {...props}>
            {children}
        </tbody>
    );
}

export function SATR({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr className={clsx(
            "hover:bg-[var(--sa-bg-card-hover)] transition-colors duration-150 group",
            className
        )} {...props}>
            {children}
        </tr>
    );
}

export function SATD({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td className={clsx(
            "px-6 py-4 text-sm text-[var(--sa-text-primary)]",
            className
        )} {...props}>
            {children}
        </td>
    );
}

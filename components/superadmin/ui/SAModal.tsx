import React from "react";
import { X } from "lucide-react";

interface SAModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "5xl";
}

export function SAModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = "2xl"
}: SAModalProps) {
    if (!isOpen) return null;

    const maxW = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "5xl": "max-w-5xl",
    }[maxWidth];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-[var(--sa-bg-card)] border border-[var(--sa-border)] rounded-2xl w-full ${maxW} max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--sa-border)] flex justify-between items-center bg-[var(--sa-bg-elevated)] shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--sa-text-primary)] tracking-tight">
                            {title}
                        </h2>
                        {description && (
                            <p className="text-xs sm:text-sm text-[var(--sa-text-muted)] mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] p-1.5 rounded-lg hover:bg-[var(--sa-bg-card-hover)] transition-colors shrink-0 ml-4"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

import React from "react";
import { FolderOpen } from "lucide-react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg rounded-xl ${className}`} />
  );
}

export function DashboardPreviewSkeleton() {
  return (
    <div className="w-full h-full p-4 rounded-2xl dark:backdrop-blur-md dark:bg-white/5 dark:border dark:border-white/10 bg-white ring-1 ring-gray-200 shadow-xl flex flex-col gap-4">
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-24 flex-1" />
        <Skeleton className="h-24 flex-1" />
        <Skeleton className="h-24 flex-1" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function PricingCardSkeleton() {
  return (
    <div className="w-full p-8 rounded-3xl dark:backdrop-blur-md dark:bg-white/5 dark:border dark:border-white/10 bg-white ring-1 ring-gray-200 shadow-xl flex flex-col gap-6">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <div className="space-y-3 mt-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <Skeleton className="h-12 w-full mt-8" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5">
      <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full mb-4">
        <FolderOpen className="h-8 w-8 text-blue-600 dark:text-blue-400 dark:text-indigo-400" />
      </div>
      <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function RowSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}
          className="animate-pulse h-12 rounded-lg
                     bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}

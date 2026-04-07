export function RowSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}
          className="animate-pulse h-12 rounded-lg
                     bg-gray-100 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg" />
      ))}
    </div>
  );
}

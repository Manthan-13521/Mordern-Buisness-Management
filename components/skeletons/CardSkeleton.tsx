export function CardSkeleton({ height = 'h-40' }: { height?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-100
                     bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg w-full ${height}`} />
  );
}

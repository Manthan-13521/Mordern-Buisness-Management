export function CardSkeleton({ height = 'h-40' }: { height?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-100
                     dark:bg-gray-800 w-full ${height}`} />
  );
}

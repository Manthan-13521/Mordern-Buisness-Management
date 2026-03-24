import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
export default function Loading() {
  return (
    <div className="space-y-6">
      <CardSkeleton height="h-12" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton height="h-80" />
        <CardSkeleton height="h-80" />
      </div>
    </div>
  );
}

import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
export default function Loading() {
  return (
    <div className="space-y-4">
      <CardSkeleton height="h-24" />
      <CardSkeleton height="h-32" />
      <CardSkeleton height="h-24" />
    </div>
  );
}

import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
export default function Loading() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[1,2,3,4].map(i => <CardSkeleton key={i} height="h-28" />)}
    </div>
  );
}

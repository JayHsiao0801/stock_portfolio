import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-lg space-y-4">
        {/* header */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {/* 搜尋框 */}
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

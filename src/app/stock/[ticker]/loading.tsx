import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 頂部 header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
        <Skeleton className="h-7 w-7 rounded-md shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="ml-auto text-right space-y-1.5">
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
      </div>

      {/* 主體：圖表 + 資訊 */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* 圖表 */}
        <div className="flex-1 overflow-hidden p-3">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>

        {/* 右側資訊面板 */}
        <div className="w-52 shrink-0 border-l border-border/40 overflow-y-auto p-3 space-y-3">
          <Card className="border-border/60">
            <CardContent className="p-3 space-y-1.5">
              <Skeleton className="h-3 w-10 mb-1" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-3 space-y-1.5">
              <Skeleton className="h-3 w-14 mb-1" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

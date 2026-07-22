"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

/**
 * 共用的 route-level 錯誤畫面，給各個 route segment 的 error.tsx 使用。
 * 因為 AppShell（側邊欄）是各 page.tsx 自己組裝的，Next.js 觸發 error.tsx
 * 時會整個取代掉該 segment（包含側邊欄），所以這裡額外提供「回首頁」連結，
 * 讓使用者至少能離開壞掉的畫面。
 */
export function RouteError({ error, reset, title = "發生錯誤" }: RouteErrorProps) {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm border-border/60">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-destructive/10 shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground break-words">
              {error.message || "頁面載入時發生未預期的錯誤，請稍後再試"}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={() => reset()}>
              <RotateCw className="h-3.5 w-3.5" />
              重試
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/" />}>
              <Home className="h-3.5 w-3.5" />
              回首頁
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

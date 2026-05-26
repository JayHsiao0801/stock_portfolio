"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CandleChart } from "./CandleChart";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/stock/calculator";

interface StockInfo {
  ticker: string;
  shortName: string;
  longName: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  currency: string;
  exchange: string;
  peRatio: number | null;
  dividendYield: number | null;
  eps: number | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

function fmtVolume(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)} 億`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(0)} 萬`;
  return v.toLocaleString();
}

function fmtMarketCap(v: number, currency: string): string {
  if (!v) return "—";
  if (currency === "TWD") {
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)} 兆`;
    if (v >= 1e8) return `${(v / 1e8).toFixed(0)} 億`;
  } else {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  }
  return formatCurrency(v);
}

interface Props {
  ticker: string;
}

export function StockDetailClient({ ticker }: Props) {
  const router = useRouter();
  const { data: info, isLoading } = useSWR<StockInfo>(
    `/api/stock-info?ticker=${encodeURIComponent(ticker)}`,
    fetcher
  );

  const isUp = (info?.changePercent ?? 0) >= 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 頂部 header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {isLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-semibold">{info?.shortName || info?.longName || ticker}</h1>
              <span className="text-xs text-muted-foreground font-mono">{ticker}</span>
              {info?.exchange && (
                <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{info.exchange}</span>
              )}
            </div>
          </div>
        )}

        {info && (
          <div className="text-right shrink-0">
            <div className="text-base font-bold tabular-nums">
              {info.price > 0 ? `${info.currency === "TWD" ? "$" : "$"}${info.price.toFixed(2)}` : "—"}
            </div>
            <div className={cn("flex items-center justify-end gap-0.5 text-xs font-medium tabular-nums", isUp ? "text-profit" : "text-loss")}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isUp ? "+" : ""}{info.change.toFixed(2)} ({isUp ? "+" : ""}{info.changePercent.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      {/* 主體：圖表 + 資訊 */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* 圖表 */}
        <div className="flex-1 overflow-hidden">
          <CandleChart ticker={ticker} />
        </div>

        {/* 右側資訊面板 */}
        <div className="w-52 shrink-0 border-l border-border/40 overflow-y-auto p-3 space-y-3">
          <Card className="border-border/60">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground font-medium mb-1.5">今日</p>
              {isLoading ? (
                <div className="space-y-1.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}</div>
              ) : (
                <>
                  <StatRow label="開盤" value={info?.open ? info.open.toFixed(2) : "—"} />
                  <StatRow label="最高" value={info?.high ? info.high.toFixed(2) : "—"} />
                  <StatRow label="最低" value={info?.low ? info.low.toFixed(2) : "—"} />
                  <StatRow label="成交量" value={info?.volume ? fmtVolume(info.volume) : "—"} />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground font-medium mb-1.5">基本資訊</p>
              {isLoading ? (
                <div className="space-y-1.5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}</div>
              ) : (
                <>
                  <StatRow label="市值" value={info ? fmtMarketCap(info.marketCap, info.currency) : "—"} />
                  <StatRow label="52週高" value={info?.fiftyTwoWeekHigh ? info.fiftyTwoWeekHigh.toFixed(2) : "—"} />
                  <StatRow label="52週低" value={info?.fiftyTwoWeekLow ? info.fiftyTwoWeekLow.toFixed(2) : "—"} />
                  <StatRow label="本益比" value={info?.peRatio ? info.peRatio.toFixed(2) : "—"} />
                  <StatRow label="EPS" value={info?.eps ? info.eps.toFixed(2) : "—"} />
                  <StatRow
                    label="殖利率"
                    value={info?.dividendYield ? `${(info.dividendYield * 100).toFixed(2)}%` : "—"}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

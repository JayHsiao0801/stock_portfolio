"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { DollarSign, Layers2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COLORS } from "@/components/dashboard/AllocationPieChart";
import { calcUnrealizedPnL, formatCurrency, formatPercent } from "@/lib/stock/calculator";
import { cn } from "@/lib/utils";
import { setActivePortfolio } from "@/actions/portfolioActions";
import { useAppStore } from "@/store/appStore";
import type { Holding, Portfolio } from "@/generated/prisma/client";

type PortfolioWithHoldings = Portfolio & { holdings: Holding[] };

interface RetirementSettings {
  monthlyExpense: number;
  dividendTaxRate: number;
}

interface Props {
  portfolios: PortfolioWithHoldings[];
  retirementSettings: RetirementSettings;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PortfoliosClient({ portfolios, retirementSettings }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const setActivePortfolioId = useAppStore((s) => s.setActivePortfolioId);

  const handleSelect = (id: string) => {
    setActivePortfolioId(id);
    startTransition(async () => {
      await setActivePortfolio(id);
      router.push("/");
    });
  };

  const allTickers = [...new Set(portfolios.flatMap((p) => p.holdings.map((h) => h.ticker)))];

  const { data: priceMap = {} } = useSWR<Record<string, number>>(
    allTickers.length > 0 ? `/api/stock-price/batch?tickers=${allTickers.join(",")}` : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const portfolioData = portfolios.map((p, i) => {
    const enriched = p.holdings.map((h) => {
      const price = priceMap[h.ticker] ?? h.avgCost;
      const { value, cost, pnl, pnlPct } = calcUnrealizedPnL(Number(h.shares), Number(h.avgCost), price);
      return { ...h, price, value, cost, pnl, pnlPct };
    });
    const totalValue = enriched.reduce((s, h) => s + h.value, 0);
    const totalCost = enriched.reduce((s, h) => s + h.cost, 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    const totalDividend = enriched.reduce((s, h) => s + h.value * (Number(h.dividendYield ?? 0) / 100), 0);
    const topHoldings = [...enriched].sort((a, b) => b.value - a.value).slice(0, 5);
    return { ...p, holdings: enriched, totalValue, totalCost, totalPnL, totalPnLPct, totalDividend, topHoldings, color: COLORS[i % COLORS.length] };
  });

  const grandTotal = portfolioData.reduce((s, p) => s + p.totalValue, 0);

  if (portfolios.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        尚無投資組合資料，請先新增組合與持股
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
          <Layers2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">各組合重點</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {portfolios.length} 個組合 · 點擊進入詳細頁面
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {portfolioData.map((p) => {
          const plannedCash = Number((p as Portfolio & { plannedCash: number }).plannedCash ?? 0);
          const afterTaxDividend = p.totalDividend * (1 - retirementSettings.dividendTaxRate / 100);
          const monthlyAfterTax = afterTaxDividend / 12;
          const fireRatio = retirementSettings.monthlyExpense > 0
            ? (monthlyAfterTax / retirementSettings.monthlyExpense) * 100
            : null;

          return (
            <Card key={p.id} className="border-border/60 cursor-pointer hover:border-primary/60 hover:bg-accent/40 transition-all duration-150 active:scale-[0.99]" onClick={() => handleSelect(p.id)}>
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: p.color }} />
                    <CardTitle className="text-sm font-semibold truncate">{p.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* 主要數字 */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">總資產</p>
                    <p className="text-sm font-bold tabular-nums tracking-tight">{formatCurrency(p.totalValue + Number(p.plannedCash ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">成本</p>
                    <p className="text-sm font-medium tabular-nums tracking-tight text-muted-foreground">{formatCurrency(p.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">配息</p>
                    <p className={cn("text-sm font-medium tabular-nums tracking-tight", p.totalDividend > 0 ? "text-profit" : "text-muted-foreground")}>
                      {p.totalDividend > 0 ? formatCurrency(p.totalDividend) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">貸款</p>
                    <p className={cn("text-sm font-medium tabular-nums tracking-tight", Number(p.remainingLoan) > 0 ? "text-loss" : "text-muted-foreground")}>
                      {Number(p.remainingLoan) > 0 ? formatCurrency(Number(p.remainingLoan)) : "—"}
                    </p>
                  </div>
                </div>

                {/* FIRE 進度條 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted-foreground">FIRE 進度</span>
                    {fireRatio !== null ? (
                      <span className={cn("text-[11px] tabular-nums font-medium", fireRatio >= 100 ? "text-profit" : "text-primary")}>
                        {fireRatio.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">未設定生活費目標</span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                    {fireRatio !== null && (
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(fireRatio, 100)}%`,
                          background: fireRatio >= 100 ? "oklch(0.73 0.19 145)" : "oklch(0.62 0.21 260)",
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* 前五大持股 */}
                {p.topHoldings.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground">主要持股（{p.holdings.length} 檔）</p>
                    <div className="space-y-1">
                      {p.topHoldings.map((h) => {
                        const pos = h.pnl >= 0;
                        const holdingAlloc = p.totalValue > 0 ? (h.value / p.totalValue) * 100 : 0;
                        return (
                          <div key={h.id} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-14 truncate">{h.ticker}</span>
                              <span className="text-[11px] truncate">{h.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <span className="text-[11px] text-muted-foreground tabular-nums">{holdingAlloc.toFixed(1)}%</span>
                              <span className={cn("text-[11px] tabular-nums font-medium", pos ? "text-profit" : "text-loss")}>
                                {formatPercent(h.pnlPct)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 預計配置現金（唯讀） */}
                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground">流動預備金</span>
                    </div>
                    <span className="text-[11px] tabular-nums font-medium">
                      {plannedCash > 0 ? formatCurrency(plannedCash) : "—"}
                    </span>
                  </div>
                </div>

                {/* 貨幣標示 */}
                {p.currency !== "TWD" && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                    <span className="font-mono">{p.currency}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

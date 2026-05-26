"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { BarChart2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { SummaryCards } from "./SummaryCards";
import { AllocationPieChart, COLORS } from "./AllocationPieChart";
import { HoldingsTable } from "./HoldingsTable";
import { calcPortfolioSummary } from "@/lib/stock/calculator";
import type { Holding, Portfolio } from "@/generated/prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  portfolio: (Portfolio & { holdings: Holding[] }) | null;
  availableProviders: { claude: boolean; gemini: boolean };
}

export function DashboardClient({ portfolio, availableProviders }: Props) {
  const { setPortfolioContext } = useAppStore();

  const tickers = portfolio?.holdings.map((h) => h.ticker) ?? [];
  const { data: priceMap = {}, isLoading: priceLoading } = useSWR<Record<string, number>>(
    tickers.length > 0 ? `/api/stock-price/batch?tickers=${tickers.join(",")}` : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const holdings = portfolio?.holdings ?? [];

  const colorMap: Record<string, string> = {};
  [...holdings]
    .map((h) => ({ ticker: h.ticker, value: Number(h.shares) * (priceMap[h.ticker] ?? Number(h.avgCost)) }))
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .forEach((h, i) => { colorMap[h.ticker] = COLORS[i % COLORS.length]; });

  const holdingsWithPrice = holdings.map((h) => ({
    ...h,
    currentPrice: priceMap[h.ticker] ?? h.avgCost,
  }));

  const summary = calcPortfolioSummary(holdingsWithPrice);

  const portfolioContext = portfolio
    ? `投資組合名稱：${portfolio.name}\n` +
      holdings
        .map((h) => {
          const price = priceMap[h.ticker] ?? h.avgCost;
          const value = h.shares * price;
          const pnl = value - h.shares * h.avgCost;
          const pnlPct = ((pnl / (h.shares * h.avgCost)) * 100).toFixed(2);
          return `- ${h.name}(${h.ticker})：持有 ${h.shares} 股，成本 ${h.avgCost}，現價 ${price}，損益 ${pnl.toFixed(0)}（${pnlPct}%）`;
        })
        .join("\n")
    : "";

  useEffect(() => {
    setPortfolioContext(portfolioContext);
  }, [portfolioContext, setPortfolioContext]);

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        請先建立投資組合
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0 h-full">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
          <BarChart2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">股票配置</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {portfolio.name} · {holdings.length} 檔持股
          </p>
        </div>
      </div>
      <SummaryCards
        totalValue={summary.totalValue}
        totalCost={summary.totalCost}
        totalPnL={summary.totalPnL}
        totalPnLPct={summary.totalPnLPct}
      />
      <AllocationPieChart holdings={holdings} priceMap={priceMap} />
      <HoldingsTable
        holdings={holdings}
        portfolioId={portfolio.id}
        priceMap={priceMap}
        priceLoading={priceLoading}
        colorMap={colorMap}
      />
    </div>
  );
}

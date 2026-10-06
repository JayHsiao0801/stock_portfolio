"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { BarChart2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { SummaryCards } from "./SummaryCards";
import { AllocationPieChart, COLORS } from "./AllocationPieChart";
import { HoldingsTable } from "./HoldingsTable";
import { calcPortfolioSummary, convertCurrency, DISPLAY_CURRENCIES } from "@/lib/stock/calculator";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { recordDailyPnLSnapshot } from "@/actions/portfolioActions";
import { cn } from "@/lib/utils";
import type { Holding, Portfolio } from "@/generated/prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const EMPTY_HOLDINGS: Holding[] = [];

interface Props {
  portfolio: (Portfolio & { holdings: Holding[] }) | null;
  brokerageFeeRate: number;
}

interface DailyPnLResult {
  portfolioId: string;
  periods: Record<PnLPeriodKey, {
    pnl: number | null;
    baselineDate: string | null;
  }>;
  quotedCount: number;
  totalCount: number;
  recorded: boolean;
  error?: boolean;
}

type PnLPeriodKey = "day" | "week" | "month";

export function DashboardClient({ portfolio, brokerageFeeRate }: Props) {
  const { setPortfolioContext } = useAppStore();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [dailyPnLResult, setDailyPnLResult] = useState<DailyPnLResult | null>(null);

  const tickers = portfolio?.holdings.map((h) => h.ticker) ?? [];
  const { data: priceMap = {}, isLoading: priceLoading } = useSWR<Record<string, number>>(
    tickers.length > 0 ? `/api/stock-price/batch?tickers=${tickers.join(",")}` : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  const { data: rates = {} } = useSWR<Record<string, number>>(
    "/api/exchange-rates",
    fetcher,
    { refreshInterval: 60 * 60 * 1000, revalidateOnFocus: false }
  );

  const holdings = portfolio?.holdings ?? EMPTY_HOLDINGS;

  const colorMap: Record<string, string> = {};
  [...holdings]
    .map((h) => ({
      ticker: h.ticker,
      value: convertCurrency(
        Number(h.shares) * (priceMap[h.ticker] ?? Number(h.avgCost)),
        h.currency || "TWD",
        "TWD",
        rates
      ),
    }))
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .forEach((h, i) => { colorMap[h.ticker] = COLORS[i % COLORS.length]; });

  const holdingsWithPrice = holdings.map((h) => ({
    ...h,
    currentPrice: priceMap[h.ticker] ?? h.avgCost,
  }));

  const summary = calcPortfolioSummary(holdingsWithPrice, rates);
  const hasRequiredRates = holdings.every((h) => {
    const currency = h.currency || "TWD";
    return currency === "TWD" || (typeof rates[currency] === "number" && rates[currency] > 0);
  });
  const snapshotPositions = useMemo(() => holdings.map((h) => {
    const currency = h.currency || "TWD";
    const currentPrice = priceMap[h.ticker];
    return {
      holdingId: h.id,
      ticker: h.ticker,
      shares: Number(h.shares),
      currentPriceTWD: typeof currentPrice === "number"
        ? convertCurrency(currentPrice, currency, "TWD", rates)
        : null,
      costPriceTWD: convertCurrency(Number(h.avgCost), currency, "TWD", rates),
    };
  }), [holdings, priceMap, rates]);
  const currentDailyPnLResult = dailyPnLResult?.portfolioId === portfolio?.id
    ? dailyPnLResult
    : null;
  const noBaselineNote: Record<PnLPeriodKey, string> = {
    day: "尚無前次紀錄",
    week: "尚無本週前紀錄",
    month: "尚無本月前紀錄",
  };
  const makePeriodDisplay = (period: PnLPeriodKey) => {
    const periodResult = currentDailyPnLResult?.periods[period];
    let note = priceLoading ? "等待即時報價" : "計算中…";

    if (!hasRequiredRates) {
      note = "等待匯率資料";
    } else if (!priceLoading) {
      if (!currentDailyPnLResult) {
        note = "計算中…";
      } else if (currentDailyPnLResult.error) {
        note = "暫時無法計算";
      } else if (!currentDailyPnLResult.recorded) {
        note = "本次無可用報價";
      } else if (periodResult?.baselineDate) {
        const [, month, day] = periodResult.baselineDate.split("-");
        note = `較 ${Number(month)}/${Number(day)} 最近紀錄`;
      } else {
        note = noBaselineNote[period];
      }

      if (
        currentDailyPnLResult &&
        currentDailyPnLResult.totalCount > 0 &&
        currentDailyPnLResult.quotedCount < currentDailyPnLResult.totalCount
      ) {
        note += ` · ${currentDailyPnLResult.quotedCount}/${currentDailyPnLResult.totalCount} 檔報價`;
      }
    }

    return { value: periodResult?.pnl ?? null, note };
  };
  const periodPnL = {
    day: makePeriodDisplay("day"),
    week: makePeriodDisplay("week"),
    month: makePeriodDisplay("month"),
  };

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

  useEffect(() => {
    let cancelled = false;

    if (!portfolio || priceLoading || !hasRequiredRates) {
      return () => { cancelled = true; };
    }

    const now = new Date();
    const snapshotDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    recordDailyPnLSnapshot(portfolio.id, snapshotDate, snapshotPositions)
      .then((result) => {
        if (cancelled) return;
        setDailyPnLResult({ portfolioId: portfolio.id, ...result });
      })
      .catch((error) => {
        console.error("Failed to record daily PnL snapshot:", error);
        if (!cancelled) {
          setDailyPnLResult({
            portfolioId: portfolio.id,
            periods: {
              day: { pnl: null, baselineDate: null },
              week: { pnl: null, baselineDate: null },
              month: { pnl: null, baselineDate: null },
            },
            quotedCount: 0,
            totalCount: snapshotPositions.length,
            recorded: false,
            error: true,
          });
        }
      });

    return () => { cancelled = true; };
  }, [portfolio, priceLoading, hasRequiredRates, snapshotPositions]);

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
        <div className="ml-auto flex items-center rounded-md border border-border/60 overflow-hidden text-[11px]">
          {DISPLAY_CURRENCIES.map((c, i) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setDisplayCurrency(c.code)}
              className={cn(
                "px-2 py-1 font-medium transition-colors",
                i > 0 && "border-l border-border/60",
                displayCurrency === c.code
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <SummaryCards
        totalValue={summary.totalValue}
        totalCost={summary.totalCost}
        totalPnL={summary.totalPnL}
        totalPnLPct={summary.totalPnLPct}
        periodPnL={periodPnL}
        displayCurrency={displayCurrency}
        rates={rates}
      />
      <AllocationPieChart holdings={holdings} priceMap={priceMap} rates={rates} />
      <HoldingsTable
        holdings={holdings}
        portfolioId={portfolio.id}
        priceMap={priceMap}
        priceLoading={priceLoading}
        colorMap={colorMap}
        brokerageFeeRate={brokerageFeeRate}
        displayCurrency={displayCurrency}
        rates={rates}
      />
    </div>
  );
}

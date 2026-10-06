"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPercent, convertCurrency } from "@/lib/stock/calculator";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPct: number;
  periodPnL: Record<PnLPeriodKey, { value: number | null; note: string }>;
  displayCurrency?: string;
  rates?: Record<string, number>;
}

type PnLPeriodKey = "day" | "week" | "month";

const PERIOD_OPTIONS: Array<{ key: PnLPeriodKey; label: string; ariaLabel: string }> = [
  { key: "day", label: "日", ariaLabel: "單日損益" },
  { key: "week", label: "週", ariaLabel: "本週損益" },
  { key: "month", label: "月", ariaLabel: "本月損益" },
];

export function SummaryCards({ totalValue, totalCost, totalPnL, totalPnLPct, periodPnL, displayCurrency = "TWD", rates = {} }: SummaryCardsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PnLPeriodKey>("day");
  const totalTrend = Math.sign(totalPnL);
  const totalTrendClass = totalTrend > 0 ? "text-profit" : totalTrend < 0 ? "text-loss" : "text-neutral";
  const totalTrendBg = totalTrend > 0
    ? "bg-[oklch(0.65_0.24_25/0.12)]"
    : totalTrend < 0
      ? "bg-[oklch(0.73_0.19_145/0.12)]"
      : "bg-muted";
  const PnLIcon = totalTrend > 0 ? TrendingUp : totalTrend < 0 ? TrendingDown : Minus;
  const selectedPnL = periodPnL[selectedPeriod];
  const periodValue = selectedPnL.value;
  const hasPeriodPnL = periodValue !== null;
  const periodTrend = Math.sign(periodValue ?? 0);
  const periodTrendClass = periodTrend > 0 ? "text-profit" : periodTrend < 0 ? "text-loss" : "text-neutral";
  const fmt = (amount: number) => {
    const converted = convertCurrency(amount, "TWD", displayCurrency, rates);
    return "$" + new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(Math.round(converted));
  };

  type CardItem = {
    label: string;
    value: string;
    icon?: React.ElementType;
    iconClass?: string;
    iconBg?: string;
    control?: React.ReactNode;
    valueClass?: string;
    sub?: string;
    subClass?: string;
  };
  const cards: CardItem[] = [
    {
      label: "總市值",
      value: fmt(totalValue),
      icon: DollarSign,
      iconClass: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      label: "總成本",
      value: fmt(totalCost),
      icon: BarChart2,
      iconClass: "text-muted-foreground",
      iconBg: "bg-muted",
    },
    {
      label: "未實現損益",
      value: fmt(totalPnL),
      icon: PnLIcon,
      iconClass: totalTrendClass,
      iconBg: totalTrendBg,
      valueClass: totalTrendClass,
    },
    {
      label: "區間損益",
      value: periodValue !== null ? fmt(periodValue) : "—",
      control: (
        <div className="flex items-center rounded-lg bg-muted p-0.5" role="group" aria-label="損益期間">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-label={option.ariaLabel}
              aria-pressed={selectedPeriod === option.key}
              onClick={() => setSelectedPeriod(option.key)}
              className={cn(
                "h-6 min-w-6 rounded-md px-1.5 text-[10px] font-semibold transition-colors",
                selectedPeriod === option.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ),
      valueClass: hasPeriodPnL
        ? periodTrendClass
        : "text-muted-foreground",
      sub: selectedPnL.note,
      subClass: "text-muted-foreground",
    },
    {
      label: "報酬率",
      value: formatPercent(totalPnLPct),
      icon: PnLIcon,
      iconClass: totalTrendClass,
      iconBg: totalTrendBg,
      valueClass: totalTrendClass,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                {c.label}
              </span>
              {c.control ?? (c.icon && (
                <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg", c.iconBg)}>
                  <c.icon className={cn("h-3.5 w-3.5", c.iconClass)} />
                </div>
              ))}
            </div>
            <div className={cn("text-xl font-semibold tracking-tight tabular-nums leading-none", c.valueClass)}>
              {c.value}
            </div>
            {c.sub && (
              <div className={cn("text-xs mt-2 tabular-nums font-medium", c.subClass ?? c.valueClass)}>
                {c.sub}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

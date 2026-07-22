"use client";

import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent, convertCurrency } from "@/lib/stock/calculator";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPct: number;
  displayCurrency?: string;
  rates?: Record<string, number>;
}

export function SummaryCards({ totalValue, totalCost, totalPnL, totalPnLPct, displayCurrency = "TWD", rates = {} }: SummaryCardsProps) {
  const isProfit = totalPnL >= 0;
  const PnLIcon = isProfit ? TrendingUp : TrendingDown;
  const fmt = (amount: number) => {
    const converted = convertCurrency(amount, "TWD", displayCurrency, rates);
    return "$" + new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(Math.round(converted));
  };

  type CardItem = { label: string; value: string; icon: React.ElementType; iconClass: string; iconBg: string; valueClass?: string; sub?: string };
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
      iconClass: isProfit ? "text-profit" : "text-loss",
      iconBg: isProfit ? "bg-[oklch(0.65_0.24_25/0.12)]" : "bg-[oklch(0.73_0.19_145/0.12)]",
      valueClass: isProfit ? "text-profit" : "text-loss",
    },
    {
      label: "報酬率",
      value: formatPercent(totalPnLPct),
      icon: PnLIcon,
      iconClass: isProfit ? "text-profit" : "text-loss",
      iconBg: isProfit ? "bg-[oklch(0.65_0.24_25/0.12)]" : "bg-[oklch(0.73_0.19_145/0.12)]",
      valueClass: isProfit ? "text-profit" : "text-loss",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                {c.label}
              </span>
              <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg", c.iconBg)}>
                <c.icon className={cn("h-3.5 w-3.5", c.iconClass)} />
              </div>
            </div>
            <div className={cn("text-xl font-semibold tracking-tight tabular-nums leading-none", c.valueClass)}>
              {c.value}
            </div>
            {c.sub && (
              <div className={cn("text-xs mt-2 tabular-nums font-medium", c.valueClass)}>
                {c.sub}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

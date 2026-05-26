export function calcUnrealizedPnL(shares: number, avgCost: number, currentPrice: number) {
  const cost = shares * avgCost;
  const value = shares * currentPrice;
  const pnl = value - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
  return { cost, value, pnl, pnlPct };
}

export function calcPortfolioSummary(
  holdings: Array<{ shares: number; avgCost: number; currentPrice?: number }>
) {
  let totalCost = 0;
  let totalValue = 0;

  for (const h of holdings) {
    totalCost += h.shares * h.avgCost;
    totalValue += h.shares * (h.currentPrice ?? h.avgCost);
  }

  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return { totalCost, totalValue, totalPnL, totalPnLPct };
}

export function formatCurrency(value: number, currency = "TWD"): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

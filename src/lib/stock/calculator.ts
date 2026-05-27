// 台灣 ETF 代號：以 0 開頭接 3-5 位數字（可加英文字母後綴），如 0050, 00878, 00403A
function getTWTransactionTaxRate(ticker: string): number {
  if (/^0\d{3,5}[A-Z]?\.(TW|TWO)$/.test(ticker)) return 0.1;  // ETF
  if (/\.(TW|TWO)$/.test(ticker)) return 0.3;                  // 台股
  return 0;                                                      // 美股
}

// 預估賣出後實際入帳金額（扣手續費 + 交易稅）
export function calcNetProceeds(value: number, ticker: string, brokerageFeeRate: number): number {
  const taxRate = getTWTransactionTaxRate(ticker);
  return value * (1 - brokerageFeeRate / 100 - taxRate / 100);
}

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

"use client";

import { useState, useTransition, useRef } from "react";
import useSWR from "swr";
import {
  TrendingUp, DollarSign, Layers,
  Settings, Calculator, Pencil, Check, X, CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLORS } from "@/components/dashboard/AllocationPieChart";
import { calcUnrealizedPnL, calcNetProceeds, formatCurrency, formatPercent } from "@/lib/stock/calculator";
import { cn } from "@/lib/utils";
import { RetirementSettingsDialog } from "./RetirementSettingsDialog";
import { updatePortfolioPlannedCash, updatePortfolioLoan, updateHoldingDividendYield } from "@/actions/portfolioActions";
import type { Holding, Portfolio } from "@/generated/prisma/client";

type PortfolioWithHoldings = Portfolio & { holdings: Holding[] };
type RetirementSettings = { exchangeRate: number; monthlyExpense: number; dividendTaxRate: number; brokerageFeeRate: number };

interface Props {
  portfolio: PortfolioWithHoldings | null;
  retirementSettings: RetirementSettings;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AllocationClient({ portfolio, retirementSettings }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [yieldMap, setYieldMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (portfolio?.holdings ?? []).map((h) => [
        h.id,
        h.dividendYield > 0 ? h.dividendYield.toString() : "",
      ])
    )
  );

  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [, startCashTransition] = useTransition();

  const [editingLoan, setEditingLoan] = useState(false);
  const [loanAmountInput, setLoanAmountInput] = useState("");
  const [loanRateInput, setLoanRateInput] = useState("");
  const [loanPeriodInput, setLoanPeriodInput] = useState("");
  const [loanPeriodUnit, setLoanPeriodUnit] = useState<"months" | "years">("months");
  const [, startLoanTransition] = useTransition();

  const tickers = portfolio?.holdings.map((h) => h.ticker) ?? [];

  const { data: priceMap = {} } = useSWR<Record<string, number>>(
    tickers.length > 0 ? `/api/stock-price/batch?tickers=${tickers.join(",")}` : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        尚無投資組合資料，請先新增組合與持股
      </div>
    );
  }

  const enrichedHoldings = portfolio.holdings.map((h, i) => {
    const price = priceMap[h.ticker] ?? h.avgCost;
    const { value, cost, pnl, pnlPct } = calcUnrealizedPnL(Number(h.shares), Number(h.avgCost), price);
    return { ...h, price, value, cost, pnl, pnlPct, color: COLORS[i % COLORS.length] };
  }).sort((a, b) => b.value - a.value);

  const totalValue = enrichedHoldings.reduce((s, h) => s + h.value, 0);
  const plannedCash = Number(portfolio.plannedCash ?? 0);
  const remainingLoan = Number(portfolio.remainingLoan ?? 0);
  const loanInterestRate = Number(portfolio.loanInterestRate ?? 0);
  const loanMonths = Number(portfolio.loanMonths ?? 0);
  const totalAsset = totalValue + plannedCash;

  const handleCashSave = () => {
    const value = parseFloat(cashInput) || 0;
    startCashTransition(async () => {
      await updatePortfolioPlannedCash(portfolio.id, value);
      setEditingCash(false);
    });
  };

  const handleLoanSave = () => {
    const months = loanPeriodUnit === "years"
      ? Math.round(parseFloat(loanPeriodInput) * 12) || 0
      : Math.round(parseFloat(loanPeriodInput)) || 0;
    startLoanTransition(async () => {
      await updatePortfolioLoan(portfolio.id, {
        remainingLoan: parseFloat(loanAmountInput) || 0,
        loanInterestRate: parseFloat(loanRateInput) || 0,
        loanMonths: months,
      });
      setEditingLoan(false);
    });
  };

  const openLoanEdit = () => {
    setLoanAmountInput(remainingLoan > 0 ? remainingLoan.toString() : "");
    setLoanRateInput(loanInterestRate > 0 ? loanInterestRate.toString() : "");
    setLoanPeriodInput(loanMonths > 0 ? loanMonths.toString() : "");
    setLoanPeriodUnit("months");
    setEditingLoan(true);
  };

  const yieldTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleYieldChange = (holdingId: string, value: string) => {
    setYieldMap((prev) => ({ ...prev, [holdingId]: value }));
    clearTimeout(yieldTimers.current[holdingId]);
    yieldTimers.current[holdingId] = setTimeout(() => {
      updateHoldingDividendYield(holdingId, Math.max(0, parseFloat(value) || 0));
    }, 600);
  };

  const handleYieldBlur = (holdingId: string, value: string) => {
    clearTimeout(yieldTimers.current[holdingId]);
    const clamped = Math.max(0, parseFloat(value) || 0);
    setYieldMap((prev) => ({ ...prev, [holdingId]: clamped > 0 ? clamped.toString() : "" }));
    updateHoldingDividendYield(holdingId, clamped);
  };

  const dividendRows = enrichedHoldings.map((h) => {
    const yieldPct = parseFloat(yieldMap[h.id] ?? "") || 0;
    const annualDividend = h.value * (yieldPct / 100);
    return { ...h, yieldPct, annualDividend };
  });
  const totalAnnualDividend = dividendRows.reduce((s, h) => s + h.annualDividend, 0);
  const estimatedYield = totalValue > 0 ? (totalAnnualDividend / totalValue) * 100 : 0;
  const afterTaxDividend = totalAnnualDividend * (1 - retirementSettings.dividendTaxRate / 100);
  const monthlyAfterTax = afterTaxDividend / 12;
  const fireRatio = retirementSettings.monthlyExpense > 0
    ? (monthlyAfterTax / retirementSettings.monthlyExpense) * 100
    : null;

  const loanPeriodMonths = loanPeriodUnit === "years"
    ? Math.round(parseFloat(loanPeriodInput) * 12) || 0
    : Math.round(parseFloat(loanPeriodInput)) || 0;

  return (
    <div className="space-y-5 pb-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">總資產配置</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {portfolio.name}
          </p>
        </div>
      </div>

      {/* 摘要卡片 */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 預計配置現金（可編輯） */}
        <Card
          className={cn("border-border/60 transition-colors", !editingCash && "cursor-pointer hover:border-primary/50 hover:bg-accent/30")}
          onClick={() => { if (!editingCash) { setCashInput(plannedCash.toString()); setEditingCash(true); } }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">流動預備金</span>
              <div className="flex items-center gap-1">
                {editingCash ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-profit hover:text-profit" onClick={(e) => { e.stopPropagation(); handleCashSave(); }}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setEditingCash(false); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted/60 text-muted-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            </div>
            {editingCash ? (
              <Input
                type="number"
                step="1000"
                min="0"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                className="h-8 text-base font-semibold tabular-nums"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCashSave();
                  if (e.key === "Escape") setEditingCash(false);
                }}
              />
            ) : (
              <div className="text-xl font-semibold tracking-tight tabular-nums leading-none border-b border-dashed border-muted-foreground/30 pb-0.5 w-fit">
                {plannedCash > 0 ? formatCurrency(plannedCash) : "—"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 股票總市值 */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">股票總市值</span>
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="text-xl font-semibold tracking-tight tabular-nums leading-none">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>

        {/* 總資產 */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">總資產</span>
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
                <Layers className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="text-xl font-semibold tracking-tight tabular-nums leading-none">
              {formatCurrency(totalAsset)}
            </div>
            <div className="text-xs mt-2 tabular-nums font-medium text-muted-foreground">
              現金 + 股票
            </div>
          </CardContent>
        </Card>

        {/* 剩餘貸款（唯讀，在下方貸款區編輯） */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">剩餘貸款</span>
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-destructive/10">
                <CreditCard className="h-3.5 w-3.5 text-destructive/60" />
              </div>
            </div>
            <div className={cn("text-xl font-semibold tracking-tight tabular-nums leading-none", remainingLoan > 0 ? "text-loss" : "")}>
              {remainingLoan > 0 ? formatCurrency(remainingLoan) : "—"}
            </div>
          </CardContent>
        </Card>

        {/* 年配息 */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">年配息</span>
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
                <Calculator className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="text-xl font-semibold tracking-tight tabular-nums leading-none">
              {afterTaxDividend > 0 ? formatCurrency(afterTaxDividend) : "—"}
            </div>
            {totalAnnualDividend > 0 && (
              <div className="text-xs mt-2 tabular-nums font-medium text-muted-foreground">
                稅前 {formatCurrency(totalAnnualDividend)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 殖利率 */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">殖利率</span>
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="text-xl font-semibold tracking-tight tabular-nums leading-none">
              {totalAnnualDividend > 0 ? formatPercent(estimatedYield) : "—"}
            </div>
            {totalAnnualDividend > 0 && (
              <div className="text-xs mt-2 tabular-nums font-medium text-muted-foreground">
                月均 {formatCurrency(monthlyAfterTax)} 稅後
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 退休規劃參考 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-semibold tracking-tight">退休規劃參考</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-3 w-3" />
            設定
          </Button>
        </div>
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">年配息</p>
                <p className="text-base font-bold tabular-nums">
                  {totalAnnualDividend > 0
                    ? formatCurrency(totalAnnualDividend)
                    : <span className="text-muted-foreground text-sm font-normal">請在下方輸入殖利率</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  稅後年收入 <span className="opacity-60">(-{retirementSettings.dividendTaxRate}%)</span>
                </p>
                <p className="text-base font-bold tabular-nums text-profit">
                  {afterTaxDividend > 0 ? formatCurrency(afterTaxDividend) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">稅後月收入</p>
                <p className="text-base font-bold tabular-nums">
                  {monthlyAfterTax > 0 ? formatCurrency(monthlyAfterTax) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  USD 換算 <span className="opacity-60">(1:{retirementSettings.exchangeRate})</span>
                </p>
                <p className="text-base font-bold tabular-nums text-muted-foreground">
                  {afterTaxDividend > 0 && retirementSettings.exchangeRate > 0
                    ? `$${(afterTaxDividend / retirementSettings.exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">FIRE 達成率</span>
                  {retirementSettings.monthlyExpense === 0 && (
                    <span className="text-[10px] text-muted-foreground">（請在設定中填入每月生活費目標）</span>
                  )}
                </div>
                {fireRatio !== null && (
                  <span className={cn("text-sm font-bold tabular-nums", fireRatio >= 100 ? "text-profit" : "text-primary")}>
                    {fireRatio.toFixed(1)}%
                  </span>
                )}
              </div>
              {fireRatio !== null && (
                <>
                  <div className="h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(fireRatio, 100)}%`,
                        background: fireRatio >= 100 ? "oklch(0.73 0.19 145)" : "oklch(0.62 0.21 260)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    每月生活費目標 {formatCurrency(retirementSettings.monthlyExpense)}，
                    月收入 {formatCurrency(monthlyAfterTax)}
                    {fireRatio >= 100 && " · 已達 FIRE 目標 🎉"}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 配息 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">配息</h2>
            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              輸入各股預期年化殖利率 %，結果自動儲存
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                {["股票", "市值(台幣)", "年化殖利率 %", "年配息", "月配息"].map((col, i) => (
                  <th
                    key={`${col}-${i}`}
                    className={cn(
                      "text-xs text-muted-foreground font-medium h-9 px-4",
                      i === 0 ? "text-left" : "text-right"
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dividendRows.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors text-xs"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-sm shrink-0" style={{ background: h.color }} />
                      <div>
                        <div className="font-medium text-[13px] leading-tight">{h.name}</div>
                        <div className="text-muted-foreground font-mono text-[11px] mt-0.5">{h.ticker}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(h.value)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={yieldMap[h.id] ?? ""}
                        onChange={(e) => handleYieldChange(h.id, e.target.value)}
                        onBlur={(e) => handleYieldBlur(h.id, e.target.value)}
                        placeholder="0.0"
                        className="h-6 text-[11px] w-20 px-1.5 text-right tabular-nums"
                      />
                      <span className="text-[11px] text-muted-foreground">%</span>
                    </div>
                  </td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums font-medium", h.annualDividend > 0 ? "text-profit" : "text-muted-foreground/40")}>
                    {h.annualDividend > 0 ? formatCurrency(h.annualDividend) : "—"}
                  </td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums", h.annualDividend > 0 ? "text-profit/80" : "text-muted-foreground/40")}>
                    {h.annualDividend > 0 ? formatCurrency(h.annualDividend / 12) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {totalAnnualDividend > 0 && (
              <tfoot>
                <tr className="border-t border-border/40 bg-muted/20">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    殖利率 {formatPercent(estimatedYield)}
                  </td>
                  <td colSpan={2} />
                  <td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-profit">
                    {formatCurrency(totalAnnualDividend)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-profit/80">
                    {formatCurrency(totalAnnualDividend / 12)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 貸款 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">貸款</h2>
          </div>
          {!editingLoan && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={openLoanEdit}
            >
              <Pencil className="h-3 w-3" />
              編輯
            </Button>
          )}
        </div>

        <Card className="border-border/60">
          <CardContent className="p-5">
            {editingLoan ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">貸款金額</label>
                    <Input
                      type="number"
                      step="10000"
                      min="0"
                      value={loanAmountInput}
                      onChange={(e) => setLoanAmountInput(e.target.value)}
                      placeholder="0"
                      className="h-8 text-sm tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">年利率 %</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={loanRateInput}
                      onChange={(e) => setLoanRateInput(e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">還款期數</label>
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={loanPeriodInput}
                        onChange={(e) => setLoanPeriodInput(e.target.value)}
                        placeholder="0"
                        className="h-8 text-sm tabular-nums"
                      />
                      <div className="flex rounded-md overflow-hidden border border-input shrink-0">
                        <button
                          type="button"
                          onClick={() => setLoanPeriodUnit("months")}
                          className={cn(
                            "px-2.5 text-[11px] font-medium transition-colors",
                            loanPeriodUnit === "months"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          月
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoanPeriodUnit("years")}
                          className={cn(
                            "px-2.5 text-[11px] font-medium transition-colors border-l border-input",
                            loanPeriodUnit === "years"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          年
                        </button>
                      </div>
                    </div>
                    {loanPeriodInput && Number(loanPeriodInput) > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {loanPeriodUnit === "years"
                          ? `= ${loanPeriodMonths} 個月`
                          : `≈ ${(Number(loanPeriodInput) / 12).toFixed(1)} 年`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs px-4" onClick={handleLoanSave}>
                    儲存
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setEditingLoan(false)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">貸款金額</p>
                  <p className={cn("text-base font-bold tabular-nums", remainingLoan > 0 ? "text-loss" : "text-muted-foreground")}>
                    {remainingLoan > 0 ? formatCurrency(remainingLoan) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">年利率</p>
                  <p className="text-base font-bold tabular-nums">
                    {loanInterestRate > 0 ? `${loanInterestRate}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">還款期數</p>
                  <p className="text-base font-bold tabular-nums">
                    {loanMonths > 0 ? (
                      <>
                        {loanMonths} 個月
                        {loanMonths >= 12 && (
                          <span className="text-xs text-muted-foreground ml-1.5">
                            ≈ {(loanMonths / 12).toFixed(1)} 年
                          </span>
                        )}
                      </>
                    ) : "—"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RetirementSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={retirementSettings}
      />
    </div>
  );
}

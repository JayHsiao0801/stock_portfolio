"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import useSWR from "swr";
import {
  TrendingUp, DollarSign, Layers,
  Settings, Calculator, Pencil, Check, X, CreditCard, Plus, Trash2, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLORS } from "@/components/dashboard/AllocationPieChart";
import { calcUnrealizedPnL, calcNetProceeds, formatCurrency, formatPercent, DISPLAY_CURRENCIES, convertCurrency } from "@/lib/stock/calculator";
import { cn } from "@/lib/utils";
import { RetirementSettingsDialog } from "./RetirementSettingsDialog";
import { updatePortfolioPlannedCash, createLoan, updateLoan, deleteLoan, updateHoldingDividendYield, updateRetirementSettings } from "@/actions/portfolioActions";
import type { Holding, Loan, Portfolio } from "@/generated/prisma/client";

type PortfolioWithHoldings = Portfolio & { holdings: Holding[]; loans: Loan[] };
type RetirementSettings = { monthlyExpense: number; dividendTaxRate: number; brokerageFeeRate: number };

interface Props {
  portfolio: PortfolioWithHoldings | null;
  retirementSettings: RetirementSettings;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LoanFormState {
  label: string; amount: string; rate: string; period: string; periodUnit: "months" | "years";
}
function LoanForm({ form, onChange, periodMonths, onSave, onCancel }: {
  form: LoanFormState;
  onChange: (f: LoanFormState) => void;
  periodMonths: number;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (k: keyof LoanFormState, v: string) => onChange({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-[11px] text-muted-foreground">名稱（選填，如：房貸、車貸）</label>
          <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="貸款" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground">貸款金額</label>
          <Input type="number" step="10000" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" className="h-8 text-sm tabular-nums" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground">年利率 %</label>
          <Input type="number" step="0.01" min="0" max="100" value={form.rate} onChange={(e) => set("rate", e.target.value)} placeholder="0.00" className="h-8 text-sm tabular-nums" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-[11px] text-muted-foreground">還款期數</label>
          <div className="flex gap-1.5">
            <Input type="number" step="1" min="0" value={form.period} onChange={(e) => set("period", e.target.value)} placeholder="0" className="h-8 text-sm tabular-nums" />
            <div className="flex rounded-md overflow-hidden border border-input shrink-0">
              {(["months", "years"] as const).map((u, i) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChange({ ...form, periodUnit: u })}
                  className={cn(
                    "px-2.5 text-[11px] font-medium transition-colors",
                    i > 0 && "border-l border-input",
                    form.periodUnit === u ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {u === "months" ? "月" : "年"}
                </button>
              ))}
            </div>
          </div>
          {form.period && Number(form.period) > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {form.periodUnit === "years" ? `= ${periodMonths} 個月` : `≈ ${(Number(form.period) / 12).toFixed(1)} 年`}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs px-4" onClick={onSave}>儲存</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onCancel}>取消</Button>
      </div>
    </div>
  );
}

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

  const [localMonthlyExpense, setLocalMonthlyExpense] = useState(retirementSettings.monthlyExpense);
  const [editingExpense, setEditingExpense] = useState(false);
  const [expenseInput, setExpenseInput] = useState("");
  const [, startExpenseTransition] = useTransition();

  useEffect(() => {
    setLocalMonthlyExpense(retirementSettings.monthlyExpense);
  }, [retirementSettings.monthlyExpense]);

  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({ label: "", amount: "", rate: "", period: "", periodUnit: "months" as "months" | "years" });
  const [, startLoanTransition] = useTransition();

  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { data: rates = {} } = useSWR<Record<string, number>>(
    "/api/exchange-rates",
    fetcher,
    { refreshInterval: 60 * 60 * 1000, revalidateOnFocus: false }
  );

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
  const loans = portfolio.loans ?? [];
  const totalAsset = totalValue + plannedCash;

  const handleCashSave = () => {
    const value = parseFloat(cashInput) || 0;
    startCashTransition(async () => {
      await updatePortfolioPlannedCash(portfolio.id, value);
      setEditingCash(false);
    });
  };

  const handleExpenseSave = () => {
    const value = parseFloat(expenseInput) || 0;
    setLocalMonthlyExpense(value);
    startExpenseTransition(async () => {
      await updateRetirementSettings({ monthlyExpense: value });
      setEditingExpense(false);
    });
  };

  const calcLoanMonths = (period: string, unit: "months" | "years") =>
    unit === "years" ? Math.round(parseFloat(period) * 12) || 0 : Math.round(parseFloat(period)) || 0;

  const openNewLoan = () => {
    setLoanForm({ label: "", amount: "", rate: "", period: "", periodUnit: "months" });
    setEditingLoanId("new");
  };

  const openEditLoan = (loan: Loan) => {
    setLoanForm({
      label: loan.label ?? "",
      amount: loan.remainingLoan > 0 ? loan.remainingLoan.toString() : "",
      rate: loan.loanInterestRate > 0 ? loan.loanInterestRate.toString() : "",
      period: loan.loanMonths > 0 ? loan.loanMonths.toString() : "",
      periodUnit: "months",
    });
    setEditingLoanId(loan.id);
  };

  const handleLoanSave = () => {
    const months = calcLoanMonths(loanForm.period, loanForm.periodUnit);
    const data = {
      label: loanForm.label,
      remainingLoan: parseFloat(loanForm.amount) || 0,
      loanInterestRate: parseFloat(loanForm.rate) || 0,
      loanMonths: months,
    };
    startLoanTransition(async () => {
      if (editingLoanId === "new") {
        await createLoan(portfolio.id, data);
      } else if (editingLoanId) {
        await updateLoan(editingLoanId, data);
      }
      setEditingLoanId(null);
    });
  };

  const handleLoanDelete = (id: string) => {
    if (!confirm("確定刪除此筆貸款？")) return;
    startLoanTransition(async () => {
      await deleteLoan(id);
    });
  };

  const [fetchingYields, setFetchingYields] = useState(false);

  const autoFetchYields = async () => {
    setFetchingYields(true);
    try {
      const results = await Promise.allSettled(
        enrichedHoldings.map((h) =>
          fetch(`/api/stock-info?ticker=${encodeURIComponent(h.ticker)}`)
            .then((r) => r.json())
            .then((data: { dividendYield?: number | null }) => ({ id: h.id, dividendYield: data.dividendYield ?? null }))
        )
      );
      const updates: Array<{ id: string; pct: number }> = [];
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.dividendYield !== null) {
          const pct = r.value.dividendYield > 1
            ? r.value.dividendYield
            : r.value.dividendYield * 100;
          updates.push({ id: r.value.id, pct: Math.round(pct * 100) / 100 });
        }
      });
      if (updates.length > 0) {
        setYieldMap((prev) => {
          const next = { ...prev };
          updates.forEach(({ id, pct }) => { next[id] = pct.toString(); });
          return next;
        });
        await Promise.all(updates.map(({ id, pct }) => updateHoldingDividendYield(id, pct)));
      }
    } finally {
      setFetchingYields(false);
    }
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
  const fireRatio = localMonthlyExpense > 0
    ? (monthlyAfterTax / localMonthlyExpense) * 100
    : null;

  const requiredGrossAnnual = localMonthlyExpense > 0
    ? (localMonthlyExpense * 12) / (1 - retirementSettings.dividendTaxRate / 100)
    : 0;
  const requiredYield = (localMonthlyExpense > 0 && totalValue > 0)
    ? (requiredGrossAnnual / totalValue) * 100
    : null;
  const dividendGap = localMonthlyExpense > 0
    ? Math.max(0, requiredGrossAnnual - totalAnnualDividend)
    : null;

  const calcMonthlyPayment = (remainingLoan: number, loanInterestRate: number, loanMonths: number) => {
    if (remainingLoan <= 0 || loanMonths <= 0) return 0;
    const r = loanInterestRate / 100 / 12;
    if (r === 0) return remainingLoan / loanMonths;
    return remainingLoan * r * Math.pow(1 + r, loanMonths) / (Math.pow(1 + r, loanMonths) - 1);
  };

  const totalRemainingLoan = loans.reduce((s, l) => s + Number(l.remainingLoan), 0);
  const monthlyLoanPayment = loans.reduce(
    (s, l) => s + calcMonthlyPayment(Number(l.remainingLoan), Number(l.loanInterestRate), Number(l.loanMonths)),
    0
  );
  const monthlyExpense = localMonthlyExpense;
  const totalMonthlyOutflow = monthlyExpense + monthlyLoanPayment;

  const formPeriodMonths = calcLoanMonths(loanForm.period, loanForm.periodUnit);

  // 所有金額一律以 TWD 為基準再換算至 displayCurrency
  const fmt = (amount: number) => {
    const converted = convertCurrency(amount, "TWD", displayCurrency, rates);
    return "$" + new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(Math.round(converted));
  };

  return (
    <div className="space-y-5 pb-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">總資產配置</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{portfolio.name}</p>
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
                {plannedCash > 0 ? fmt(plannedCash) : "—"}
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
              {fmt(totalValue)}
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
              {fmt(totalAsset)}
            </div>
            <div className="text-xs mt-2 tabular-nums font-medium text-muted-foreground">
              現金 + 股票
            </div>
          </CardContent>
        </Card>

        {/* 每月支出 */}
        <Card
          className={cn("border-border/60 transition-colors", !editingExpense && "cursor-pointer hover:border-primary/50 hover:bg-accent/30")}
          onClick={() => { if (!editingExpense) { setExpenseInput(monthlyExpense.toString()); setEditingExpense(true); } }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">每月支出</span>
              <div className="flex items-center gap-1">
                {editingExpense ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-profit hover:text-profit" onClick={(e) => { e.stopPropagation(); handleExpenseSave(); }}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setEditingExpense(false); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-destructive/10">
                    <Pencil className="h-3.5 w-3.5 text-destructive/60" />
                  </div>
                )}
              </div>
            </div>
            {editingExpense ? (
              <>
                <p className="text-[10px] text-muted-foreground mb-1.5">生活費（每月）</p>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  value={expenseInput}
                  onChange={(e) => setExpenseInput(e.target.value)}
                  className="h-8 text-base font-semibold tabular-nums"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleExpenseSave();
                    if (e.key === "Escape") setEditingExpense(false);
                  }}
                />
                {monthlyLoanPayment > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                    + 還款 {fmt(Math.round(monthlyLoanPayment))}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className={cn("text-xl font-semibold tracking-tight tabular-nums leading-none border-b border-dashed border-muted-foreground/30 pb-0.5 w-fit", totalMonthlyOutflow > 0 ? "text-orange-500" : "")}>
                  {totalMonthlyOutflow > 0 ? fmt(Math.round(totalMonthlyOutflow)) : "—"}
                </div>
                {totalMonthlyOutflow > 0 && (
                  <div className="text-xs mt-2 text-muted-foreground space-y-0.5">
                    {monthlyExpense > 0 && (
                      <div className="tabular-nums">生活費 {fmt(monthlyExpense)}</div>
                    )}
                    {monthlyLoanPayment > 0 && (
                      <div className="tabular-nums">還款 {fmt(Math.round(monthlyLoanPayment))}</div>
                    )}
                  </div>
                )}
              </>
            )}
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
            <div className={cn("text-xl font-semibold tracking-tight tabular-nums leading-none", afterTaxDividend > 0 ? "text-profit" : "")}>
              {afterTaxDividend > 0 ? fmt(afterTaxDividend) : "—"}
            </div>
            {totalAnnualDividend > 0 && (
              <div className="text-xs mt-2 tabular-nums font-medium text-muted-foreground">
                稅前 {fmt(totalAnnualDividend)}
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
                月均 {fmt(monthlyAfterTax)} 稅後
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
            <div className="flex gap-5">
              {/* 左側：指標欄 + FIRE */}
              <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-4">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">年配息</p>
                  <p className="text-base font-bold tabular-nums">
                    {totalAnnualDividend > 0
                      ? fmt(totalAnnualDividend)
                      : <span className="text-muted-foreground text-sm font-normal">請在下方輸入殖利率</span>}
                  </p>
                  {totalAnnualDividend > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      殖利率 {estimatedYield.toFixed(2)}%
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">
                    稅後年收入 <span className="opacity-60">(-{retirementSettings.dividendTaxRate}%)</span>
                  </p>
                  <p className="text-base font-bold tabular-nums text-profit">
                    {afterTaxDividend > 0 ? fmt(afterTaxDividend) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">稅後月收入</p>
                  <p className="text-base font-bold tabular-nums">
                    {monthlyAfterTax > 0 ? fmt(monthlyAfterTax) : "—"}
                  </p>
                  {monthlyExpense > 0 && monthlyAfterTax > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      目標 {fmt(monthlyExpense)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">需達殖利率</p>
                  <p className="text-base font-bold tabular-nums">
                    {requiredYield !== null
                      ? <span className={cn(estimatedYield >= requiredYield ? "text-profit" : "")}>{requiredYield.toFixed(2)}%</span>
                      : <span className="text-muted-foreground text-sm font-normal">—</span>}
                  </p>
                  {requiredYield !== null && estimatedYield > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      目前 {estimatedYield.toFixed(2)}%
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">配息缺口</p>
                  <p className={cn("text-base font-bold tabular-nums", dividendGap === 0 ? "text-profit" : "")}>
                    {dividendGap !== null
                      ? (dividendGap === 0 ? "已達標" : fmt(dividendGap))
                      : <span className="text-muted-foreground text-sm font-normal">—</span>}
                  </p>
                  {dividendGap !== null && dividendGap > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">年配息需補足</p>
                  )}
                </div>
              </div>
                <div className="pt-3 border-t border-border/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">FIRE 達成率</span>
                      {monthlyExpense === 0 && (
                        <span className="text-[10px] text-muted-foreground">（請點擊上方卡片填入每月生活費）</span>
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
                        每月生活費目標 {fmt(monthlyExpense)}，月收入 {fmt(monthlyAfterTax)}
                        {fireRatio >= 100 && " · 已達 FIRE 目標 🎉"}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {/* 右側：稅換算匯率 */}
              <div className="shrink-0 border-l border-border/30 pl-4 hidden md:flex md:flex-col md:gap-4 min-w-[148px]">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">稅換算匯率</p>
                  {Object.keys(rates).length > 0 ? (
                    <div className="space-y-1">
                      {DISPLAY_CURRENCIES.map((c) => {
                        if (c.code === displayCurrency) {
                          return (
                            <div key={c.code}>
                              <span className="text-[10px] text-muted-foreground font-mono">{c.code} <span className="opacity-60 tabular-nums">1:1</span></span>
                            </div>
                          );
                        }
                        const fromTWD = displayCurrency === "TWD" ? 1 : 1 / (rates[displayCurrency] ?? 1);
                        const toAmount = c.code === "TWD" ? 1 : (rates[c.code] ?? 1);
                        const r = fromTWD * toAmount;
                        const rStr = r >= 10 ? r.toFixed(1) : r >= 0.1 ? r.toFixed(2) : r.toFixed(3);
                        return (
                          <div key={c.code}>
                            <span className="text-[10px] text-muted-foreground font-mono">{c.code} <span className="opacity-60 tabular-nums">≈1:{rStr}</span></span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">—</p>
                  )}
                </div>
              </div>
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
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={autoFetchYields}
            disabled={fetchingYields}
          >
            <RefreshCw className={cn("h-3 w-3", fetchingYields && "animate-spin")} />
            {fetchingYields ? "取得中…" : "自動取得"}
          </Button>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                {["股票", "市值", "年化殖利率 %", "年配息", "月配息"].map((col, i) => (
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
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(h.value)}</td>
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
                    {h.annualDividend > 0 ? fmt(h.annualDividend) : "—"}
                  </td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums", h.annualDividend > 0 ? "text-profit/80" : "text-muted-foreground/40")}>
                    {h.annualDividend > 0 ? fmt(h.annualDividend / 12) : "—"}
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
                    {fmt(totalAnnualDividend)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-profit/80">
                    {fmt(totalAnnualDividend / 12)}
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
            {loans.length > 0 && (
              <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {loans.length} 筆
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 text-xs px-2"
            onClick={openNewLoan}
            disabled={editingLoanId !== null}
          >
            <Plus className="h-3 w-3" />
            新增貸款
          </Button>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            {loans.length === 0 && editingLoanId !== "new" && (
              <p className="text-sm text-muted-foreground text-center py-4">尚無貸款紀錄</p>
            )}

            {loans.map((loan) => {
              const mp = calcMonthlyPayment(Number(loan.remainingLoan), Number(loan.loanInterestRate), Number(loan.loanMonths));
              const isEditing = editingLoanId === loan.id;
              return (
                <div key={loan.id} className={cn("rounded-lg border border-border/50 p-4", isEditing && "border-primary/40 bg-accent/20")}>
                  {isEditing ? (
                    <LoanForm
                      form={loanForm}
                      onChange={setLoanForm}
                      periodMonths={formPeriodMonths}
                      onSave={handleLoanSave}
                      onCancel={() => setEditingLoanId(null)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {loan.label || "貸款"}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={() => openEditLoan(loan)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleLoanDelete(loan.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">貸款金額</p>
                          <p className="text-sm font-bold tabular-nums text-loss">
                            {Number(loan.remainingLoan) > 0 ? fmt(Number(loan.remainingLoan)) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">年利率</p>
                          <p className="text-sm font-bold tabular-nums">
                            {Number(loan.loanInterestRate) > 0 ? `${loan.loanInterestRate}%` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">還款期數</p>
                          <p className="text-sm font-bold tabular-nums">
                            {Number(loan.loanMonths) > 0 ? (
                              <>
                                {loan.loanMonths} 個月
                                {Number(loan.loanMonths) >= 12 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ≈ {(Number(loan.loanMonths) / 12).toFixed(1)} 年
                                  </span>
                                )}
                              </>
                            ) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">每月還款</p>
                          <p className="text-sm font-bold tabular-nums text-loss">
                            {mp > 0 ? fmt(Math.round(mp)) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 新增貸款表單 */}
            {editingLoanId === "new" && (
              <div className="rounded-lg border border-primary/40 bg-accent/20 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">新增貸款</p>
                <LoanForm
                  form={loanForm}
                  onChange={setLoanForm}
                  periodMonths={formPeriodMonths}
                  onSave={handleLoanSave}
                  onCancel={() => setEditingLoanId(null)}
                />
              </div>
            )}

            {/* 合計 */}
            {loans.length > 1 && (
              <div className="flex items-center gap-8 pt-3 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">貸款合計</span>
                  <span className="text-sm font-bold tabular-nums text-loss">
                    {fmt(totalRemainingLoan)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">每月總還款</span>
                  <span className="text-sm font-bold tabular-nums text-loss">
                    {monthlyLoanPayment > 0 ? fmt(Math.round(monthlyLoanPayment)) : "—"}
                  </span>
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

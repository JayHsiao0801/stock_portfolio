"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRetirementSettings } from "@/actions/portfolioActions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: { monthlyExpense: number; dividendTaxRate: number; brokerageFeeRate: number };
}

export function RetirementSettingsDialog({ open, onOpenChange, settings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [monthlyExpense, setMonthlyExpense] = useState(settings.monthlyExpense.toString());
  const [dividendTaxRate, setDividendTaxRate] = useState(settings.dividendTaxRate.toString());
  const [brokerageFeeRate, setBrokerageFeeRate] = useState(settings.brokerageFeeRate.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await updateRetirementSettings({
        monthlyExpense: parseFloat(monthlyExpense) || 0,
        dividendTaxRate: parseFloat(dividendTaxRate) || 0,
        brokerageFeeRate: parseFloat(brokerageFeeRate) || 0.1425,
      });
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">退休規劃設定</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">每月生活費目標（元）</label>
            <Input
              type="number"
              step="1"
              min="0"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(e.target.value)}
              className="h-8 text-sm"
              placeholder="60000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">配息有效稅率（%）</label>
            <p className="text-[10px] text-muted-foreground/60">含健保補充保費 2.11%，可依個人實際狀況調整</p>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={dividendTaxRate}
              onChange={(e) => setDividendTaxRate(e.target.value)}
              className="h-8 text-sm"
              placeholder="10.0"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">手續費率（%）</label>
            <p className="text-[10px] text-muted-foreground/60">標準 0.1425%，依券商折扣調整。台股 + 0.3%、台股 ETF + 0.1% 交易稅由系統自動加算</p>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={brokerageFeeRate}
              onChange={(e) => setBrokerageFeeRate(e.target.value)}
              className="h-8 text-sm"
              placeholder="0.1425"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

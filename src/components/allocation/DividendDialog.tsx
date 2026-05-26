"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDividendRecord } from "@/actions/holdingActions";
import type { Holding, Portfolio } from "@/generated/prisma/client";

type PortfolioWithHoldings = Portfolio & { holdings: Holding[] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolios: PortfolioWithHoldings[];
}

export function DividendDialog({ open, onOpenChange, portfolios }: Props) {
  const [isPending, startTransition] = useTransition();
  const [portfolioId, setPortfolioId] = useState("");
  const [holdingId, setHoldingId] = useState("");
  const [amountPerShare, setAmountPerShare] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const selectedPortfolio = portfolios.find((p) => p.id === portfolioId);
  const selectedHolding = selectedPortfolio?.holdings.find((h) => h.id === holdingId);
  const totalDividend = selectedHolding && amountPerShare
    ? Number(selectedHolding.shares) * parseFloat(amountPerShare || "0")
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdingId || !amountPerShare || !date) return;

    startTransition(async () => {
      await addDividendRecord(holdingId, {
        amountPerShare: parseFloat(amountPerShare),
        date: new Date(date),
        notes: notes || undefined,
      });
      setPortfolioId("");
      setHoldingId("");
      setAmountPerShare("");
      setNotes("");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">新增配息紀錄</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">投資組合</label>
            <select
              value={portfolioId}
              onChange={(e) => { setPortfolioId(e.target.value); setHoldingId(""); }}
              className="w-full h-8 text-sm bg-input border border-border rounded-md px-2 text-foreground"
              required
            >
              <option value="">選擇組合…</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">股票</label>
            <select
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              disabled={!portfolioId}
              className="w-full h-8 text-sm bg-input border border-border rounded-md px-2 text-foreground disabled:opacity-50"
              required
            >
              <option value="">選擇股票…</option>
              {selectedPortfolio?.holdings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}（{h.ticker}）· {h.shares} 股
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">每股配息（元）</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountPerShare}
                onChange={(e) => setAmountPerShare(e.target.value)}
                className="h-8 text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">配息日期</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-sm"
                required
              />
            </div>
          </div>

          {totalDividend !== null && totalDividend > 0 && (
            <div className="rounded-lg bg-primary/[0.08] border border-primary/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">本次配息總額</p>
              <p className="text-sm font-semibold text-primary tabular-nums mt-0.5">
                ${totalDividend.toLocaleString("zh-TW", { maximumFractionDigits: 0 })} 元
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">備注（選填）</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-sm"
              placeholder="例：2024 Q4 配息"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !holdingId || !amountPerShare}>
              {isPending ? "儲存中…" : "新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

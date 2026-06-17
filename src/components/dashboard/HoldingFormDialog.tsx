"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHolding, updateHolding } from "@/actions/holdingActions";
import { cn } from "@/lib/utils";
import { DISPLAY_CURRENCIES } from "@/lib/stock/calculator";
import type { Holding } from "@/generated/prisma/client";

const schema = z.object({
  ticker: z.string().min(1, "必填"),
  name: z.string().min(1, "必填"),
  shares: z.number({ error: "請輸入數字" }).positive("必須大於 0"),
  avgCost: z.number({ error: "請輸入數字" }).positive("必須大於 0"),
  currency: z.string().min(1),
  sector: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  currency: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  holding?: Holding | null;
}

export function HoldingFormDialog({ open, onOpenChange, portfolioId, holding }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { currency: "TWD" },
    values: holding
      ? {
          ticker: holding.ticker,
          name: holding.name,
          shares: holding.shares,
          avgCost: holding.avgCost,
          currency: holding.currency,
          sector: holding.sector ?? "",
          notes: holding.notes ?? "",
        }
      : undefined,
  });

  const tickerValue = watch("ticker") ?? "";
  const currencyValue = watch("currency") ?? "TWD";

  useEffect(() => {
    if (open && !holding) {
      reset({ currency: "TWD", ticker: "", name: "", sector: "", notes: "" });
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [open, holding, reset]);

  useEffect(() => {
    if (holding) return;
    if (skipNextSearch.current) { skipNextSearch.current = false; return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!tickerValue || tickerValue.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(tickerValue)}`);
        const data: SearchResult[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [tickerValue, holding]);

  const handleSelect = (result: SearchResult) => {
    skipNextSearch.current = true;
    setValue("ticker", result.symbol, { shouldValidate: true });
    setValue("name", result.name, { shouldValidate: true });
    setValue("currency", result.currency);
    if (result.sector) setValue("sector", result.sector);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      if (holding) {
        await updateHolding(holding.id, data);
      } else {
        await createHolding({ portfolioId, ...data });
      }
      reset({ currency: "TWD" });
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSuggestions([]); setShowDropdown(false); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{holding ? "編輯持股" : "新增持股"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* 股票代號 + autocomplete */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">股票代號（如 2330.TW）</label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Input
                    {...register("ticker")}
                    className="h-8 text-sm pr-6"
                    autoComplete="off"
                    onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                    onBlur={() => { setTimeout(() => setShowDropdown(false), 150); }}
                  />
                  {searching && (
                    <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 w-72 rounded-lg border border-border bg-popover shadow-md overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                        onMouseDown={() => handleSelect(s)}
                      >
                        <span className="font-mono font-medium shrink-0">{s.symbol}</span>
                        <span className="text-muted-foreground truncate flex-1 min-w-0">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">{s.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.ticker && <p className="text-xs text-destructive">{errors.ticker.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">股票名稱</label>
              <Input {...register("name")} className="h-8 text-sm" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">持有股數</label>
              <Input {...register("shares", { valueAsNumber: true })} type="number" step="any" className="h-8 text-sm" />
              {errors.shares && <p className="text-xs text-destructive">{errors.shares.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">平均成本</label>
              <Input {...register("avgCost", { valueAsNumber: true })} type="number" step="any" className="h-8 text-sm" />
              {errors.avgCost && <p className="text-xs text-destructive">{errors.avgCost.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">幣別</label>
              <div className="flex items-center rounded-md border border-input overflow-hidden text-[11px] h-8">
                {DISPLAY_CURRENCIES.map((c, i) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setValue("currency", c.code)}
                    className={cn(
                      "flex-1 h-full font-medium transition-colors",
                      i > 0 && "border-l border-input",
                      currencyValue === c.code
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">產業（選填）</label>
              <Input {...register("sector")} className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">備注（選填）</label>
            <Input {...register("notes")} className="h-8 text-sm" />
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

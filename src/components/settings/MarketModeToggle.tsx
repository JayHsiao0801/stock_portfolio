"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { updateRetirementSettings } from "@/actions/portfolioActions";

const OPTIONS = [
  {
    value: "tw",
    label: "台股 / 美股",
    desc: "搜尋台灣、美國股票（Yahoo Finance）",
  },
  {
    value: "cn",
    label: "陸股（A股）",
    desc: "搜尋上交所、深交所股票（簡體中文 / 股票代號）",
  },
];

export function MarketModeToggle({ initial }: { initial: string }) {
  const [market, setMarket] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const handleChange = (value: string) => {
    setMarket(value);
    setSaved(false);
    startTransition(async () => {
      await updateRetirementSettings({ stockMarket: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleChange(opt.value)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
            market === opt.value
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-accent/40"
          )}
        >
          <div className={cn(
            "h-3.5 w-3.5 rounded-full border-2 shrink-0 transition-colors",
            market === opt.value ? "border-primary bg-primary" : "border-muted-foreground/40"
          )} />
          <div>
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-xs text-muted-foreground">{opt.desc}</div>
          </div>
        </button>
      ))}
      {saved && (
        <p className="text-xs text-profit pl-1">已儲存</p>
      )}
    </div>
  );
}

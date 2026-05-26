"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ChartCandlestick } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  currency: string;
}

export function StockSearchClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) { setResults([]); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(value)}`);
        setResults(await res.json());
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
          <ChartCandlestick className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">個股查詢</h1>
          <p className="text-xs text-muted-foreground mt-0.5">搜尋股票代號或名稱</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="例：2330.TW、AAPL、台積電…"
          className="pl-9 pr-9 h-10"
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          {results.map((r, i) => (
            <button
              key={r.symbol}
              onClick={() => router.push(`/stock/${encodeURIComponent(r.symbol)}`)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-accent/50 transition-colors text-left",
                i !== 0 && "border-t border-border/30"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-sm">{r.symbol}</span>
                  <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{r.exchange}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.name}</div>
              </div>
              {r.sector && (
                <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-3">{r.sector}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!searching && query && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">找不到結果</p>
      )}
    </div>
  );
}

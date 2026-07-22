"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
} from "lightweight-charts";
import { cn } from "@/lib/utils";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const RANGES = ["1m", "3m", "6m", "1y", "2y", "5y"] as const;
type Range = (typeof RANGES)[number];

interface Props {
  ticker: string;
}

export function CandleChart({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [range, setRange] = useState<Range>("1y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async (t: string, r: Range) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/stock-history?ticker=${encodeURIComponent(t)}&range=${r}`);
      const data: Candle[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) { setError(true); return null; }
      return [...data].sort((a, b) => a.time - b.time);
    } catch {
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const bg = isDark ? "#0d0d0d" : "#ffffff";
    const textColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: false },
    });

    const isTW = ticker.endsWith(".TW") || ticker.endsWith(".TWO");
    const upColor   = isTW ? "#ef4444" : "#22c55e";
    const downColor = isTW ? "#22c55e" : "#ef4444";

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      color: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
      priceScaleId: "vol",
      priceFormat: { type: "volume" },
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    loadData(ticker, range).then((candles) => {
      if (!candles) return;
      candleSeries.setData(
        candles.map((c) => ({ time: c.time as unknown as string, open: c.open, high: c.high, low: c.low, close: c.close }))
      );
      volSeries.setData(
        candles.map((c) => ({
          time: c.time as unknown as string,
          value: c.volume,
          color: c.close >= c.open
            ? (isTW ? "rgba(239, 68, 68, 0.45)" : "rgba(34, 197, 94, 0.45)")
            : (isTW ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)"),
        }))
      );
      chart.timeScale().fitContent();
    });

    return () => chart.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, range, isDark, loadData]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 shrink-0">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-2.5 py-0.5 rounded text-xs font-medium transition-colors",
              range === r ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 pointer-events-none">
            <span className="text-xs text-muted-foreground animate-pulse">載入中…</span>
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground">無法取得歷史資料</span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/layout/ThemeProvider";

interface Props {
  ticker: string;
}

function toTradingViewSymbol(ticker: string): string {
  if (ticker.endsWith(".TW")) return `TWSE:${ticker.replace(".TW", "")}`;
  if (ticker.endsWith(".TWO")) return `TPEX:${ticker.replace(".TWO", "")}`;
  return ticker;
}

export function TradingViewChart({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: toTradingViewSymbol(ticker),
      interval: "D",
      timezone: "Asia/Taipei",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "zh_TW",
      allow_symbol_change: false,
      calendar: false,
      hide_side_toolbar: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);
  }, [ticker, isDark]);

  return (
    <div className="tradingview-widget-container w-full h-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget w-full h-full" />
    </div>
  );
}

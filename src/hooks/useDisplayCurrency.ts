"use client";

import { useState, useEffect } from "react";
import { DISPLAY_CURRENCIES } from "@/lib/stock/calculator";

const LS_KEY = "stock_display_currency";

export function useDisplayCurrency() {
  const [displayCurrency, setDisplayCurrencyState] = useState("TWD");

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && DISPLAY_CURRENCIES.some((c) => c.code === saved)) {
      setDisplayCurrencyState(saved);
    }
  }, []);

  const setDisplayCurrency = (code: string) => {
    setDisplayCurrencyState(code);
    localStorage.setItem(LS_KEY, code);
  };

  return { displayCurrency, setDisplayCurrency };
}

"use client";

import { useSyncExternalStore } from "react";
import { DISPLAY_CURRENCIES } from "@/lib/stock/calculator";

const LS_KEY = "stock_display_currency";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LS_KEY) listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  const saved = localStorage.getItem(LS_KEY);
  return saved && DISPLAY_CURRENCIES.some((c) => c.code === saved) ? saved : "TWD";
}

export function useDisplayCurrency() {
  const displayCurrency = useSyncExternalStore(subscribe, getSnapshot, () => "TWD");

  const setDisplayCurrency = (code: string) => {
    localStorage.setItem(LS_KEY, code);
    listeners.forEach((listener) => listener());
  };

  return { displayCurrency, setDisplayCurrency };
}

"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStockPrice(ticker: string) {
  const { data, isLoading } = useSWR(
    `/api/stock-price?ticker=${ticker}`,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  return { price: data?.price as number | undefined, isLoading };
}

export function useStockPrices(tickers: string[]) {
  const { data, isLoading } = useSWR(
    tickers.length > 0 ? `/api/stock-price/batch?tickers=${tickers.join(",")}` : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  return { prices: (data ?? {}) as Record<string, number>, isLoading };
}

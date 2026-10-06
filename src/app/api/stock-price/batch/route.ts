import { NextRequest, NextResponse } from "next/server";
import { getCached } from "@/lib/cache";
import { fetchYahooSpark } from "@/lib/yahooApi";

const CACHE_TTL = 60 * 1000; // 即時報價，快取 60 秒

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get("tickers");
  if (!tickersParam) return NextResponse.json({});

  const tickers = [...new Set(tickersParam.split(",").map((ticker) => ticker.trim()).filter(Boolean))];

  try {
    const result = await getCached(
      `stock-price-batch:${tickers.slice().sort().join(",")}`,
      CACHE_TTL,
      async () => {
        const quotes = await fetchYahooSpark(tickers);
        const prices: Record<string, number> = {};

        for (const ticker of tickers) {
          const price = quotes.get(ticker)?.meta.regularMarketPrice;
          if (typeof price === "number" && price > 0) prices[ticker] = price;
        }

        if (Object.keys(prices).length === 0) throw new Error("no prices");
        return prices;
      }
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}

import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getCached } from "@/lib/cache";

const yf = new YahooFinance();

const CACHE_TTL = 60 * 1000; // 即時報價，快取 60 秒

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get("tickers");
  if (!tickersParam) return NextResponse.json({});

  const tickers = tickersParam.split(",").filter(Boolean);
  const result: Record<string, number> = {};

  await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        const price = await getCached(`stock-price-batch:${ticker}`, CACHE_TTL, async () => {
          const quote = await yf.quote(ticker, {}, { validateResult: false });
          const p = quote?.regularMarketPrice;
          if (typeof p !== "number" || p <= 0) throw new Error("no price");
          return p;
        });
        result[ticker] = price;
      } catch {
        // 查詢失敗時不加入，前端 fallback 到成本價
      }
    })
  );

  return NextResponse.json(result);
}

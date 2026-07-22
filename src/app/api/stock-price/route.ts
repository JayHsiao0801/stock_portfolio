import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getCached } from "@/lib/cache";

const yf = new YahooFinance();

const CACHE_TTL = 60 * 1000; // 即時報價，快取 60 秒

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    const data = await getCached(`stock-price:${ticker}`, CACHE_TTL, async () => {
      const quote = await yf.quote(ticker, {}, { validateResult: false });
      return {
        ticker,
        price: quote.regularMarketPrice ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        currency: quote.currency ?? "TWD",
        updatedAt: new Date().toISOString(),
      };
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: `無法取得 ${ticker} 股價` }, { status: 500 });
  }
}

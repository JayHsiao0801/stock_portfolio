import { NextRequest, NextResponse } from "next/server";
import { getCached } from "@/lib/cache";
import { fetchYahooChart } from "@/lib/yahooApi";

const CACHE_TTL = 60 * 1000; // 即時報價，快取 60 秒

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    const data = await getCached(`stock-price:${ticker}`, CACHE_TTL, async () => {
      const quote = await fetchYahooChart(ticker);
      const price = quote.meta.regularMarketPrice;
      if (typeof price !== "number" || price <= 0) throw new Error("no price");
      const previousClose = quote.meta.chartPreviousClose ?? price;
      const change = price - previousClose;
      return {
        ticker,
        price,
        change,
        changePercent: previousClose > 0 ? (change / previousClose) * 100 : 0,
        currency: quote.meta.currency ?? "TWD",
        updatedAt: new Date().toISOString(),
      };
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: `無法取得 ${ticker} 股價` }, { status: 500 });
  }
}

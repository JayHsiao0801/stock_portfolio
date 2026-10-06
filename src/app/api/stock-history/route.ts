import { NextRequest, NextResponse } from "next/server";
import { getCached } from "@/lib/cache";
import { fetchYahooChart } from "@/lib/yahooApi";

const CACHE_TTL = 10 * 60 * 1000; // 歷史資料變動不頻繁，快取 10 分鐘

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const range = req.nextUrl.searchParams.get("range") ?? "1y";
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const yahooRange = range.endsWith("m") ? `${range.slice(0, -1)}mo` : range;

  try {
    const candles = await getCached(`stock-history:${ticker}:${range}`, CACHE_TTL, async () => {
      const result = await fetchYahooChart(ticker, yahooRange, "1d");
      const quote = result.indicators?.quote?.[0];
      return (result.timestamp ?? []).flatMap((time, index) => {
        const open = quote?.open?.[index];
        const high = quote?.high?.[index];
        const low = quote?.low?.[index];
        const close = quote?.close?.[index];
        if (open == null || high == null || low == null || close == null) return [];
        return [{
          time,
          open,
          high,
          low,
          close,
          volume: quote?.volume?.[index] ?? 0,
        }];
      });
    });
    return NextResponse.json(candles);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

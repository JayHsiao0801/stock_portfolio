import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getCached } from "@/lib/cache";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const CACHE_TTL = 10 * 60 * 1000; // 歷史資料變動不頻繁，快取 10 分鐘

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const range = req.nextUrl.searchParams.get("range") ?? "1y";
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const now = new Date();
  const period1 = new Date(now);
  switch (range) {
    case "1m":  period1.setMonth(now.getMonth() - 1); break;
    case "3m":  period1.setMonth(now.getMonth() - 3); break;
    case "6m":  period1.setMonth(now.getMonth() - 6); break;
    case "2y":  period1.setFullYear(now.getFullYear() - 2); break;
    case "5y":  period1.setFullYear(now.getFullYear() - 5); break;
    default:    period1.setFullYear(now.getFullYear() - 1); break;
  }

  try {
    const candles = await getCached(`stock-history:${ticker}:${range}`, CACHE_TTL, async () => {
      const result = await yf.chart(ticker, { period1, interval: "1d" }, { validateResult: false });
      return (result.quotes ?? [])
        .filter((q) => q.open != null && q.close != null)
        .map((q) => ({
          time: Math.floor(new Date(q.date).getTime() / 1000),
          open: Number(q.open),
          high: Number(q.high),
          low: Number(q.low),
          close: Number(q.close),
          volume: Number(q.volume ?? 0),
        }));
    });
    return NextResponse.json(candles);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

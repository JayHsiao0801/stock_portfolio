import { NextRequest, NextResponse } from "next/server";
import { getCached } from "@/lib/cache";
import { fetchYahooChart, fetchYahooFundamentals } from "@/lib/yahooApi";

const CACHE_TTL = 5 * 60 * 1000; // 基本資料變動不頻繁，快取 5 分鐘

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    const data = await getCached(`stock-info:${ticker}`, CACHE_TTL, async () => {
      const [chartResult, fundamentalsResult] = await Promise.allSettled([
        fetchYahooChart(ticker),
        fetchYahooFundamentals(ticker),
      ]);

      if (chartResult.status === "rejected") throw chartResult.reason;
      const chart = chartResult.value;
      const meta = chart.meta;
      const quote = chart.indicators?.quote?.[0];
      const lastIndex = Math.max(0, (chart.timestamp?.length ?? 1) - 1);
      const price = meta.regularMarketPrice ?? quote?.close?.[lastIndex] ?? 0;
      const previousClose = meta.chartPreviousClose ?? price;
      const change = price - previousClose;
      const fundamentals = fundamentalsResult.status === "fulfilled"
        ? fundamentalsResult.value
        : { marketCap: null, peRatio: null };
      const peRatio = fundamentals.peRatio;

      return {
        ticker,
        shortName: meta.shortName ?? "",
        longName: meta.longName ?? "",
        price,
        change,
        changePercent: previousClose > 0 ? (change / previousClose) * 100 : 0,
        open: quote?.open?.[lastIndex] ?? 0,
        high: meta.regularMarketDayHigh ?? quote?.high?.[lastIndex] ?? 0,
        low: meta.regularMarketDayLow ?? quote?.low?.[lastIndex] ?? 0,
        volume: meta.regularMarketVolume ?? quote?.volume?.[lastIndex] ?? 0,
        marketCap: fundamentals.marketCap ?? 0,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
        currency: meta.currency ?? "USD",
        exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
        peRatio,
        dividendYield: null,
        eps: peRatio && peRatio > 0 ? price / peRatio : null,
      };
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

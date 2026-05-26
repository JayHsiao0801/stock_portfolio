import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    const [quote, summary] = await Promise.allSettled([
      yf.quote(ticker),
      yf.quoteSummary(ticker, { modules: ["summaryDetail", "defaultKeyStatistics", "financialData"] }),
    ]);

    const q = quote.status === "fulfilled" ? quote.value : null;
    const s = summary.status === "fulfilled" ? summary.value : null;

    return NextResponse.json({
      ticker,
      shortName: q?.shortName ?? "",
      longName: q?.longName ?? "",
      price: q?.regularMarketPrice ?? 0,
      change: q?.regularMarketChange ?? 0,
      changePercent: q?.regularMarketChangePercent ?? 0,
      open: q?.regularMarketOpen ?? 0,
      high: q?.regularMarketDayHigh ?? 0,
      low: q?.regularMarketDayLow ?? 0,
      volume: q?.regularMarketVolume ?? 0,
      marketCap: q?.marketCap ?? 0,
      fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: q?.fiftyTwoWeekLow ?? 0,
      currency: q?.currency ?? "USD",
      exchange: q?.fullExchangeName ?? "",
      peRatio: (s?.summaryDetail as { trailingPE?: number } | null)?.trailingPE ?? null,
      dividendYield: (s?.summaryDetail as { dividendYield?: number } | null)?.dividendYield ?? null,
      eps: (s?.defaultKeyStatistics as { trailingEps?: number } | null)?.trailingEps ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

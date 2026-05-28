import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    const quote = await yf.quote(ticker, {}, { validateResult: false });
    return NextResponse.json({
      ticker,
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      currency: quote.currency ?? "TWD",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: `無法取得 ${ticker} 股價` }, { status: 500 });
  }
}

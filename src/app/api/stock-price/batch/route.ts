import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get("tickers");
  if (!tickersParam) return NextResponse.json({});

  const tickers = tickersParam.split(",").filter(Boolean);
  const result: Record<string, number> = {};

  await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        const quote = await yf.quote(ticker);
        const price = quote?.regularMarketPrice;
        if (typeof price === "number" && price > 0) {
          result[ticker] = price;
        }
      } catch {
        // 查詢失敗時不加入，前端 fallback 到成本價
      }
    })
  );

  return NextResponse.json(result);
}

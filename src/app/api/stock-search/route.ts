import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 台股中文名稱快取（TWSE + TPEx 合併）
let twNameCache: Map<string, string> | null = null;
let twNameCacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

async function getTwNames(): Promise<Map<string, string>> {
  if (twNameCache && Date.now() - twNameCacheTime < CACHE_TTL) return twNameCache;
  const map = new Map<string, string>();
  try {
    const [twseRes, tpexRes] = await Promise.all([
      fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"),
      fetch("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes"),
    ]);
    if (twseRes.ok) {
      const data: { Code: string; Name: string }[] = await twseRes.json();
      for (const s of data) map.set(s.Code, s.Name);
    }
    if (tpexRes.ok) {
      const data: { SecuritiesCompanyCode: string; CompanyName: string }[] = await tpexRes.json();
      for (const s of data) map.set(s.SecuritiesCompanyCode, s.CompanyName);
    }
  } catch { /* 失敗時沿用快取或空 Map */ }
  twNameCache = map;
  twNameCacheTime = Date.now();
  return map;
}

function inferCurrency(symbol: string, exchange: string): string {
  if (symbol.endsWith(".TW") || symbol.endsWith(".TWO")) return "TWD";
  if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) return "CNY";
  if (symbol.endsWith(".HK")) return "HKD";
  if (symbol.endsWith(".L")) return "GBP";
  if (symbol.endsWith(".T")) return "JPY";
  if (["TAI", "TWO"].includes(exchange)) return "TWD";
  if (["SHH", "SHZ"].includes(exchange)) return "CNY";
  return "USD";
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    const searchResult = await yf.search(q, {}, { validateResult: false });
    type Quote = { symbol: string; isYahooFinance?: boolean; quoteType?: string; [key: string]: unknown };
    const filtered = ((searchResult.quotes ?? []) as Quote[])
      .filter((r) => r.isYahooFinance && ["EQUITY", "ETF", "MUTUALFUND", "FUTURE"].includes(r.quoteType ?? ""))
      .slice(0, 8);

    const hasTW = filtered.some((r) => r.symbol.endsWith(".TW") || r.symbol.endsWith(".TWO"));
    const twNames = hasTW ? await getTwNames() : new Map<string, string>();

    const quotes = filtered.map((r) => {
      const exchange = (r as { exchange?: string }).exchange ?? "";
      const exchDisp = (r as { exchDisp?: string }).exchDisp ?? "";
      const isTW = r.symbol.endsWith(".TW") || r.symbol.endsWith(".TWO");
      const code = r.symbol.replace(/\.(TW|TWO)$/, "");
      const chineseName = isTW ? twNames.get(code) : undefined;
      const fallbackName =
        (r as { shortname?: string }).shortname ||
        (r as { longname?: string }).longname ||
        r.symbol;
      return {
        symbol: r.symbol,
        name: chineseName ?? fallbackName,
        exchange: exchDisp,
        sector: (r as { sector?: string }).sector ?? "",
        currency: inferCurrency(r.symbol, exchange),
      };
    });

    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json([]);
  }
}

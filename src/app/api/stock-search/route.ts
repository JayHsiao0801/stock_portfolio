import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";
import { getCached } from "@/lib/cache";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 台股中文名稱快取（TWSE + TPEx 合併）
const CACHE_TTL = 6 * 60 * 60 * 1000;

async function getTwNames(): Promise<Map<string, string>> {
  return getCached("tw-stock-names", CACHE_TTL, async () => {
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
    return map;
  });
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

// 陸股模式：Sina Finance 建議 API（GBK 編碼）
// 實際格式：exchangeCode,type,code,exchangeCode,name,...
// parts[0] = sz/sh + code, parts[2] = 純數字代號, parts[4] = 公司名稱
async function searchCnStocks(q: string) {
  const url = `https://suggest3.sinajs.cn/suggest/type=11,12,13&key=${encodeURIComponent(q)}&refer=&req=8`;
  const res = await fetch(url, {
    headers: { Referer: "https://finance.sina.com.cn" },
    signal: AbortSignal.timeout(5000),
  });
  // Sina API 回傳 GBK 編碼
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("gbk").decode(buffer);

  const match = text.match(/suggestvalue="([^"]*)"/);
  if (!match || !match[1]) return [];

  return match[1]
    .split(";")
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(",");
      if (parts.length < 5) return null;
      const exchangeCode = parts[0]; // e.g. "sz000977" or "sh600036"
      const code = parts[2];         // e.g. "000977"
      const name = parts[4];         // e.g. "浪潮信息"
      if (!code || !name) return null;
      const isSZ = exchangeCode.startsWith("sz");
      return {
        symbol: `${code}${isSZ ? ".SZ" : ".SS"}`,
        name,
        exchange: isSZ ? "深交所" : "上交所",
        sector: "",
        currency: "CNY",
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

async function getStockMarket(): Promise<string> {
  try {
    const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    return s?.stockMarket ?? "tw";
  } catch {
    return "tw";
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  const market = await getStockMarket();

  if (market === "cn") {
    try {
      const results = await searchCnStocks(q);
      return NextResponse.json(results);
    } catch {
      return NextResponse.json([]);
    }
  }

  // tw 模式（預設）：Yahoo Finance
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

import { NextResponse } from "next/server";

const TARGET = ["USD", "CNY", "THB", "JPY"];
let cache: { rates: Record<string, number>; time: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  if (cache && Date.now() - cache.time < CACHE_TTL) {
    return NextResponse.json(cache.rates);
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/TWD", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.result !== "success") throw new Error("API error");
    const rates: Record<string, number> = {};
    for (const k of TARGET) {
      if (data.rates[k]) rates[k] = data.rates[k];
    }
    cache = { rates, time: Date.now() };
    return NextResponse.json(rates);
  } catch {
    // 回傳快取或空物件，前端降級為原始幣值
    return NextResponse.json(cache?.rates ?? {});
  }
}

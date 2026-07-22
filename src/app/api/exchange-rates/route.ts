import { NextResponse } from "next/server";
import { getCached } from "@/lib/cache";

const TARGET = ["USD", "CNY", "THB", "JPY"];
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const rates = await getCached("exchange-rates", CACHE_TTL, async () => {
      const res = await fetch("https://open.er-api.com/v6/latest/TWD", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (data.result !== "success") throw new Error("API error");
      const result: Record<string, number> = {};
      for (const k of TARGET) {
        if (data.rates[k]) result[k] = data.rates[k];
      }
      return result;
    });
    return NextResponse.json(rates);
  } catch {
    // 完全沒有快取可用時，回傳空物件，前端降級為原始幣值
    return NextResponse.json({});
  }
}

const YAHOO_HOSTS = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

const REQUEST_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0",
};

async function fetchYahooJson<T>(path: string): Promise<T> {
  let lastError: unknown;

  for (const host of YAHOO_HOSTS) {
    try {
      const response = await fetch(`https://${host}${path}`, {
        cache: "no-store",
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Yahoo Finance request failed");
}

export interface YahooChartMeta {
  currency?: string;
  symbol?: string;
  exchangeName?: string;
  fullExchangeName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  longName?: string;
  shortName?: string;
  chartPreviousClose?: number;
}

export interface YahooChartResult {
  meta: YahooChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

interface YahooSparkResponse {
  spark?: {
    result?: Array<{
      symbol: string;
      response?: YahooChartResult[];
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
}

export interface YahooSearchQuote {
  symbol: string;
  isYahooFinance?: boolean;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
  shortname?: string;
  longname?: string;
  sector?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

function yahooError(
  source: "chart" | "spark",
  error?: { code?: string; description?: string } | null
) {
  return new Error(
    error?.description || error?.code || `Yahoo Finance ${source} returned no data`
  );
}

export async function fetchYahooChart(
  ticker: string,
  range = "5d",
  interval = "1d"
): Promise<YahooChartResult> {
  const params = new URLSearchParams({ range, interval });
  const path = `/v8/finance/chart/${encodeURIComponent(ticker)}?${params}`;
  const response = await fetchYahooJson<YahooChartResponse>(path);
  const result = response.chart?.result?.[0];

  if (!result) throw yahooError("chart", response.chart?.error);
  return result;
}

export async function fetchYahooSpark(
  tickers: string[]
): Promise<Map<string, YahooChartResult>> {
  const uniqueTickers = [...new Set(tickers.map((ticker) => ticker.trim()).filter(Boolean))];
  if (uniqueTickers.length === 0) return new Map();

  const params = new URLSearchParams({
    symbols: uniqueTickers.join(","),
    range: "5d",
    interval: "1d",
  });
  const response = await fetchYahooJson<YahooSparkResponse>(
    `/v7/finance/spark?${params}`
  );

  if (!response.spark?.result) {
    throw yahooError("spark", response.spark?.error);
  }

  return new Map(
    response.spark.result.flatMap((item) => {
      const result = item.response?.[0];
      return result ? [[item.symbol, result] as const] : [];
    })
  );
}

export async function searchYahoo(query: string): Promise<YahooSearchQuote[]> {
  const params = new URLSearchParams({
    q: query,
    quotesCount: "8",
    newsCount: "0",
  });
  const response = await fetchYahooJson<YahooSearchResponse>(
    `/v1/finance/search?${params}`
  );
  return response.quotes ?? [];
}

interface FundamentalValue {
  reportedValue?: { raw?: number };
}

interface FundamentalSeries {
  meta?: { type?: string[] };
  trailingMarketCap?: FundamentalValue[];
  trailingPeRatio?: FundamentalValue[];
}

interface YahooFundamentalsResponse {
  timeseries?: {
    result?: FundamentalSeries[] | null;
  };
}

function latestRaw(values?: FundamentalValue[]): number | null {
  const raw = values?.at(-1)?.reportedValue?.raw;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export async function fetchYahooFundamentals(ticker: string): Promise<{
  marketCap: number | null;
  peRatio: number | null;
}> {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 5 * 366 * 24 * 60 * 60;
  const params = new URLSearchParams({
    symbol: ticker,
    type: "trailingMarketCap,trailingPeRatio",
    period1: String(period1),
    period2: String(period2),
  });
  const response = await fetchYahooJson<YahooFundamentalsResponse>(
    `/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(ticker)}?${params}`
  );
  const series = response.timeseries?.result ?? [];
  const marketCapSeries = series.find((item) =>
    item.meta?.type?.includes("trailingMarketCap")
  );
  const peSeries = series.find((item) =>
    item.meta?.type?.includes("trailingPeRatio")
  );

  return {
    marketCap: latestRaw(marketCapSeries?.trailingMarketCap),
    peRatio: latestRaw(peSeries?.trailingPeRatio),
  };
}

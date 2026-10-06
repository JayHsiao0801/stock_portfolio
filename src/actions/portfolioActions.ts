"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pushDbSchema } from "@/lib/dbInit";

async function withDbInit<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist in the current database") || msg.includes("no such table")) {
      try {
        await pushDbSchema();
      } catch (pushErr) {
        console.error("[withDbInit] prisma db push failed:", pushErr);
        throw new Error("資料庫初始化失敗，請重新啟動伺服器後再試。");
      }
      return await fn();
    }
    throw e;
  }
}

export async function getPortfolios() {
  try {
    return await prisma.portfolio.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { holdings: true } } },
    });
  } catch {
    return [];
  }
}

export async function getPortfolioWithHoldings(id: string) {
  return prisma.portfolio.findUnique({
    where: { id },
    include: {
      holdings: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      loans: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getAllPortfoliosWithHoldings() {
  try {
    return await prisma.portfolio.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { holdings: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
  } catch {
    return [];
  }
}

export async function copyPortfolio(
  sourceId: string,
  data: { name: string; description?: string; currency?: string }
) {
  return withDbInit(async () => {
    const source = await prisma.portfolio.findUnique({
      where: { id: sourceId },
      include: { holdings: true },
    });
    if (!source) throw new Error("Source portfolio not found");

    const newPortfolio = await prisma.portfolio.create({ data });

    if (source.holdings.length > 0) {
      await prisma.holding.createMany({
        data: source.holdings.map((h) => ({
          portfolioId: newPortfolio.id,
          ticker: h.ticker,
          name: h.name,
          shares: h.shares,
          avgCost: h.avgCost,
          currency: h.currency,
          sector: h.sector ?? undefined,
          notes: h.notes ?? undefined,
        })),
      });
    }

    revalidatePath("/portfolio");
    revalidatePath("/");
    return newPortfolio;
  });
}

export async function updatePortfolioPlannedCash(id: string, plannedCash: number) {
  await withDbInit(() => prisma.portfolio.update({ where: { id }, data: { plannedCash } }));
  revalidatePath("/allocation");
}

export async function updateHoldingDividendYield(holdingId: string, dividendYield: number) {
  await withDbInit(() => prisma.holding.update({ where: { id: holdingId }, data: { dividendYield } }));
}

export async function createLoan(
  portfolioId: string,
  data: { label?: string; remainingLoan: number; loanInterestRate: number; loanMonths: number }
) {
  await withDbInit(() => prisma.loan.create({ data: { portfolioId, ...data } }));
  revalidatePath("/allocation");
}

export async function updateLoan(
  id: string,
  data: { label?: string; remainingLoan: number; loanInterestRate: number; loanMonths: number }
) {
  await withDbInit(() => prisma.loan.update({ where: { id }, data }));
  revalidatePath("/allocation");
}

export async function deleteLoan(id: string) {
  await withDbInit(() => prisma.loan.delete({ where: { id } }));
  revalidatePath("/allocation");
}

export async function updateRetirementSettings(data: {
  exchangeRate?: number;
  monthlyExpense?: number;
  dividendTaxRate?: number;
  brokerageFeeRate?: number;
  stockMarket?: string;
}) {
  await withDbInit(() =>
    prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    })
  );
  revalidatePath("/allocation");
}

export async function getRetirementSettings() {
  try {
    const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    return {
      exchangeRate: s?.exchangeRate ?? 32.0,
      monthlyExpense: s?.monthlyExpense ?? 0,
      dividendTaxRate: s?.dividendTaxRate ?? 10.0,
      brokerageFeeRate: s?.brokerageFeeRate ?? 0.1425,
      stockMarket: s?.stockMarket ?? "tw",
    };
  } catch {
    return {
      exchangeRate: 32.0,
      monthlyExpense: 0,
      dividendTaxRate: 10.0,
      brokerageFeeRate: 0.1425,
      stockMarket: "tw",
    };
  }
}

export async function createPortfolio(data: {
  name: string;
  description?: string;
  currency?: string;
}) {
  const portfolio = await withDbInit(() => prisma.portfolio.create({ data }));
  revalidatePath("/");
  return portfolio;
}

export async function updatePortfolio(
  id: string,
  data: { name?: string; description?: string; currency?: string }
) {
  const portfolio = await withDbInit(() => prisma.portfolio.update({ where: { id }, data }));
  revalidatePath("/");
  return portfolio;
}

export async function deletePortfolio(id: string) {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (settings?.activePortfolioId === id) {
      const next = await prisma.portfolio.findFirst({
        where: { id: { not: id } },
        orderBy: { isDefault: "desc" },
      });
      await prisma.appSettings.update({
        where: { id: "singleton" },
        data: { activePortfolioId: next?.id ?? null },
      });
    }
  } catch { /* appSettings table may not exist yet, skip */ }
  await withDbInit(() => prisma.portfolio.delete({ where: { id } }));
  revalidatePath("/");
}

export async function setActivePortfolio(id: string) {
  try {
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: { activePortfolioId: id },
      create: { id: "singleton", activePortfolioId: id },
    });
  } catch { /* appSettings table may not exist yet, skip */ }
  revalidatePath("/");
}

export async function getAppSettings() {
  try {
    return await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    return null;
  }
}

export interface DailyPnLPositionInput {
  holdingId: string;
  ticker: string;
  shares: number;
  currentPriceTWD: number | null;
  costPriceTWD: number;
}

interface StoredPnLPosition {
  holdingId: string;
  ticker: string;
  shares: number;
  priceTWD: number;
  costPriceTWD: number;
}

interface PnLBaselineSnapshot {
  snapshotDate: string;
  unrealizedPnL: number;
  positionsJson: string;
}

export interface PeriodPnLValue {
  pnl: number | null;
  baselineDate: string | null;
}

function parseStoredPositions(value: string): StoredPnLPosition[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredPnLPosition => {
      if (!item || typeof item !== "object") return false;
      const p = item as Partial<StoredPnLPosition>;
      return typeof p.holdingId === "string" &&
        typeof p.ticker === "string" &&
        typeof p.shares === "number" && Number.isFinite(p.shares) &&
        typeof p.priceTWD === "number" && Number.isFinite(p.priceTWD) &&
        typeof p.costPriceTWD === "number" && Number.isFinite(p.costPriceTWD);
    });
  } catch {
    return [];
  }
}

function getPeriodStartDates(snapshotDate: string) {
  const [year, month, day] = snapshotDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);

  return {
    weekStartDate: date.toISOString().slice(0, 10),
    monthStartDate: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`,
  };
}

function calculatePnLFromBaseline(
  currentPositions: StoredPnLPosition[],
  currentUnrealizedPnL: number,
  baseline: PnLBaselineSnapshot | null
): PeriodPnLValue {
  if (!baseline) return { pnl: null, baselineDate: null };

  const baselinePositions = parseStoredPositions(baseline.positionsJson);
  if (baselinePositions.length === 0) {
    return {
      pnl: currentUnrealizedPnL - baseline.unrealizedPnL,
      baselineDate: baseline.snapshotDate,
    };
  }

  const baselineById = new Map(baselinePositions.map((position) => [position.holdingId, position]));
  const pnl = currentPositions.reduce((total, current) => {
    const previous = baselineById.get(current.holdingId);
    if (!previous || previous.ticker !== current.ticker) {
      return total + current.shares * (current.priceTWD - current.costPriceTWD);
    }

    const retainedShares = Math.min(current.shares, previous.shares);
    const addedShares = Math.max(0, current.shares - previous.shares);
    let addedCostPrice = current.costPriceTWD;
    if (addedShares > 0) {
      const addedCost = current.shares * current.costPriceTWD -
        previous.shares * previous.costPriceTWD;
      if (Number.isFinite(addedCost) && addedCost > 0) {
        addedCostPrice = addedCost / addedShares;
      }
    }

    return total +
      retainedShares * (current.priceTWD - previous.priceTWD) +
      addedShares * (current.priceTWD - addedCostPrice);
  }, 0);

  return { pnl, baselineDate: baseline.snapshotDate };
}

export async function recordDailyPnLSnapshot(
  portfolioId: string,
  snapshotDate: string,
  positions: DailyPnLPositionInput[]
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
    throw new Error("Invalid snapshot date");
  }
  if (positions.some((p) =>
    !p.holdingId || !p.ticker || p.shares < 0 || !Number.isFinite(p.shares) ||
    !Number.isFinite(p.costPriceTWD) ||
    (p.currentPriceTWD !== null && !Number.isFinite(p.currentPriceTWD))
  )) {
    throw new Error("Invalid PnL position");
  }

  return withDbInit(async () => {
    const { weekStartDate, monthStartDate } = getPeriodStartDates(snapshotDate);
    // 日、週、月都採用期間開始以前最近一次的紀錄，休市日會自動略過。
    const [previousSnapshot, weeklyBaseline, monthlyBaseline, todaySnapshot] = await Promise.all([
      prisma.portfolioPnLSnapshot.findFirst({
        where: { portfolioId, snapshotDate: { lt: snapshotDate } },
        orderBy: { snapshotDate: "desc" },
      }),
      prisma.portfolioPnLSnapshot.findFirst({
        where: { portfolioId, snapshotDate: { lt: weekStartDate } },
        orderBy: { snapshotDate: "desc" },
      }),
      prisma.portfolioPnLSnapshot.findFirst({
        where: { portfolioId, snapshotDate: { lt: monthStartDate } },
        orderBy: { snapshotDate: "desc" },
      }),
      prisma.portfolioPnLSnapshot.findUnique({
        where: { portfolioId_snapshotDate: { portfolioId, snapshotDate } },
      }),
    ]);

    const previousPositions = parseStoredPositions(previousSnapshot?.positionsJson ?? "[]");
    const todayPositions = parseStoredPositions(todaySnapshot?.positionsJson ?? "[]");
    const previousById = new Map(previousPositions.map((p) => [p.holdingId, p]));
    const todayById = new Map(todayPositions.map((p) => [p.holdingId, p]));
    const quotedCount = positions.filter((p) => p.currentPriceTWD !== null).length;

    if (positions.length > 0 && quotedCount === 0) {
      return {
        dailyPnL: null,
        previousSnapshotDate: previousSnapshot?.snapshotDate ?? null,
        periods: {
          day: { pnl: null, baselineDate: previousSnapshot?.snapshotDate ?? null },
          week: { pnl: null, baselineDate: weeklyBaseline?.snapshotDate ?? null },
          month: { pnl: null, baselineDate: monthlyBaseline?.snapshotDate ?? null },
        },
        quotedCount,
        totalCount: positions.length,
        recorded: false,
      };
    }

    const storedPositions: StoredPnLPosition[] = positions.map((position) => {
      const sameTickerToday = todayById.get(position.holdingId)?.ticker === position.ticker
        ? todayById.get(position.holdingId)
        : undefined;
      const sameTickerPrevious = previousById.get(position.holdingId)?.ticker === position.ticker
        ? previousById.get(position.holdingId)
        : undefined;
      return {
        holdingId: position.holdingId,
        ticker: position.ticker,
        shares: position.shares,
        priceTWD: position.currentPriceTWD ??
          sameTickerToday?.priceTWD ??
          sameTickerPrevious?.priceTWD ??
          position.costPriceTWD,
        costPriceTWD: position.costPriceTWD,
      };
    });

    const unrealizedPnL = storedPositions.reduce(
      (total, p) => total + p.shares * (p.priceTWD - p.costPriceTWD),
      0
    );

    const periods = {
      day: calculatePnLFromBaseline(storedPositions, unrealizedPnL, previousSnapshot),
      week: calculatePnLFromBaseline(storedPositions, unrealizedPnL, weeklyBaseline),
      month: calculatePnLFromBaseline(storedPositions, unrealizedPnL, monthlyBaseline),
    };

    // 同一天持續更新，讓當天最後一次成功取得的報價成為隔日基準。
    await prisma.portfolioPnLSnapshot.upsert({
      where: {
        portfolioId_snapshotDate: { portfolioId, snapshotDate },
      },
      update: { unrealizedPnL, positionsJson: JSON.stringify(storedPositions) },
      create: {
        portfolioId,
        snapshotDate,
        unrealizedPnL,
        positionsJson: JSON.stringify(storedPositions),
      },
    });

    return {
      dailyPnL: periods.day.pnl,
      previousSnapshotDate: previousSnapshot?.snapshotDate ?? null,
      periods,
      quotedCount,
      totalCount: positions.length,
      recorded: true,
    };
  });
}

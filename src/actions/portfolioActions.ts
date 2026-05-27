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
    include: { holdings: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
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

export async function updatePortfolioLoan(
  id: string,
  data: { remainingLoan: number; loanInterestRate: number; loanMonths: number }
) {
  await withDbInit(() => prisma.portfolio.update({ where: { id }, data }));
  revalidatePath("/allocation");
}

export async function updateRetirementSettings(data: {
  exchangeRate?: number;
  monthlyExpense?: number;
  dividendTaxRate?: number;
  brokerageFeeRate?: number;
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
    };
  } catch {
    return {
      exchangeRate: 32.0,
      monthlyExpense: 0,
      dividendTaxRate: 10.0,
      brokerageFeeRate: 0.1425,
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

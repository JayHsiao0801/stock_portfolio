"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getPortfolios() {
  return prisma.portfolio.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { holdings: true } } },
  });
}

export async function getPortfolioWithHoldings(id: string) {
  return prisma.portfolio.findUnique({
    where: { id },
    include: { holdings: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getAllPortfoliosWithHoldings() {
  return prisma.portfolio.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { holdings: { orderBy: { createdAt: "asc" } } },
  });
}

export async function copyPortfolio(
  sourceId: string,
  data: { name: string; description?: string; currency?: string }
) {
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
}

export async function updatePortfolioPlannedCash(id: string, plannedCash: number) {
  await prisma.portfolio.update({ where: { id }, data: { plannedCash } });
  revalidatePath("/allocation");
}

export async function updateHoldingDividendYield(holdingId: string, dividendYield: number) {
  await prisma.holding.update({ where: { id: holdingId }, data: { dividendYield } });
}

export async function updatePortfolioLoan(
  id: string,
  data: { remainingLoan: number; loanInterestRate: number; loanMonths: number }
) {
  await prisma.portfolio.update({ where: { id }, data });
  revalidatePath("/allocation");
}

export async function updateRetirementSettings(data: {
  exchangeRate?: number;
  monthlyExpense?: number;
  dividendTaxRate?: number;
}) {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/allocation");
}

export async function getRetirementSettings() {
  const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return {
    exchangeRate: s?.exchangeRate ?? 32.0,
    monthlyExpense: s?.monthlyExpense ?? 0,
    dividendTaxRate: s?.dividendTaxRate ?? 10.0,
  };
}

export async function createPortfolio(data: {
  name: string;
  description?: string;
  currency?: string;
}) {
  const portfolio = await prisma.portfolio.create({ data });
  revalidatePath("/");
  return portfolio;
}

export async function updatePortfolio(
  id: string,
  data: { name?: string; description?: string; currency?: string }
) {
  const portfolio = await prisma.portfolio.update({ where: { id }, data });
  revalidatePath("/");
  return portfolio;
}

export async function deletePortfolio(id: string) {
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
  await prisma.portfolio.delete({ where: { id } });
  revalidatePath("/");
}

export async function setActivePortfolio(id: string) {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: { activePortfolioId: id },
    create: { id: "singleton", activePortfolioId: id },
  });
  revalidatePath("/");
}

export async function getAppSettings() {
  return prisma.appSettings.findUnique({ where: { id: "singleton" } });
}

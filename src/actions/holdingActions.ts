"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createHolding(data: {
  portfolioId: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currency?: string;
  sector?: string;
  notes?: string;
}) {
  const holding = await prisma.holding.create({ data });
  revalidatePath("/");
  return holding;
}

export async function updateHolding(
  id: string,
  data: {
    ticker?: string;
    name?: string;
    shares?: number;
    avgCost?: number;
    currency?: string;
    sector?: string;
    notes?: string;
  }
) {
  const holding = await prisma.holding.update({ where: { id }, data });
  revalidatePath("/");
  return holding;
}

export async function deleteHolding(id: string) {
  await prisma.holding.delete({ where: { id } });
  revalidatePath("/");
}

export async function getAllDividends() {
  return prisma.transaction.findMany({
    where: { type: "DIVIDEND" },
    include: {
      holding: {
        select: { id: true, name: true, ticker: true, shares: true, portfolioId: true,
          portfolio: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function addDividendRecord(
  holdingId: string,
  data: { amountPerShare: number; date: Date; notes?: string }
) {
  const holding = await prisma.holding.findUnique({ where: { id: holdingId } });
  if (!holding) throw new Error("Holding not found");

  const tx = await prisma.transaction.create({
    data: {
      holdingId,
      type: "DIVIDEND",
      shares: holding.shares,
      price: data.amountPerShare,
      fee: 0,
      date: data.date,
      notes: data.notes,
    },
  });
  revalidatePath("/allocation");
  return tx;
}

export async function deleteDividend(id: string) {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/allocation");
}

export async function addTransaction(
  holdingId: string,
  data: {
    type: "BUY" | "SELL" | "DIVIDEND";
    shares: number;
    price: number;
    fee?: number;
    date: Date;
    notes?: string;
  }
) {
  const tx = await prisma.transaction.create({
    data: { holdingId, ...data },
  });

  // 重算平均成本（加權平均）
  if (data.type === "BUY") {
    const holding = await prisma.holding.findUnique({ where: { id: holdingId } });
    if (holding) {
      const newShares = holding.shares + data.shares;
      const newAvgCost =
        (holding.shares * holding.avgCost + data.shares * data.price) / newShares;
      await prisma.holding.update({
        where: { id: holdingId },
        data: { shares: newShares, avgCost: newAvgCost },
      });
    }
  } else if (data.type === "SELL") {
    const holding = await prisma.holding.findUnique({ where: { id: holdingId } });
    if (holding) {
      const newShares = Math.max(0, holding.shares - data.shares);
      await prisma.holding.update({
        where: { id: holdingId },
        data: { shares: newShares },
      });
    }
  }

  revalidatePath("/");
  return tx;
}

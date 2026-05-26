import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 清除現有資料
  await prisma.transaction.deleteMany();
  await prisma.holding.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.appSettings.deleteMany();

  // 建立示範投資組合
  const portfolio = await prisma.portfolio.create({
    data: {
      name: "主力帳戶",
      description: "台股長期持有組合",
      currency: "TWD",
      isDefault: true,
      holdings: {
        create: [
          {
            ticker: "2330.TW",
            name: "台積電",
            shares: 1000,
            avgCost: 580,
            currency: "TWD",
            sector: "半導體",
          },
          {
            ticker: "2317.TW",
            name: "鴻海",
            shares: 5000,
            avgCost: 108,
            currency: "TWD",
            sector: "電子製造",
          },
          {
            ticker: "00878.TW",
            name: "國泰永續高股息",
            shares: 10000,
            avgCost: 19.5,
            currency: "TWD",
            sector: "ETF",
          },
        ],
      },
    },
  });

  // 建立 App 設定
  await prisma.appSettings.create({
    data: {
      id: "singleton",
      activePortfolioId: portfolio.id,
      aiProvider: "claude",
    },
  });

  console.log(`✓ 示範資料建立完成：Portfolio "${portfolio.name}" (${portfolio.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

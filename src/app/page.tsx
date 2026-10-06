export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getPortfolios, getAppSettings, getPortfolioWithHoldings, getRetirementSettings } from "@/actions/portfolioActions";

export default async function HomePage() {
  const [portfolios, settings, retirementSettings] = await Promise.all([getPortfolios(), getAppSettings(), getRetirementSettings()]);

  const activeId = settings?.activePortfolioId ?? portfolios[0]?.id ?? null;
  const portfolio = activeId ? await getPortfolioWithHoldings(activeId) : null;

  return (
    <AppShell>
      <DashboardClient portfolio={portfolio} brokerageFeeRate={retirementSettings.brokerageFeeRate} />
    </AppShell>
  );
}

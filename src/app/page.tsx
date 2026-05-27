export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getPortfolios, getAppSettings, getPortfolioWithHoldings, getRetirementSettings } from "@/actions/portfolioActions";

export default async function HomePage() {
  const [portfolios, settings, retirementSettings] = await Promise.all([getPortfolios(), getAppSettings(), getRetirementSettings()]);

  const activeId = settings?.activePortfolioId ?? portfolios[0]?.id ?? null;
  const portfolio = activeId ? await getPortfolioWithHoldings(activeId) : null;

  const availableProviders = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  };

  return (
    <AppShell>
      <DashboardClient portfolio={portfolio} availableProviders={availableProviders} brokerageFeeRate={retirementSettings.brokerageFeeRate} />
    </AppShell>
  );
}

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { AllocationClient } from "@/components/allocation/AllocationClient";
import { getPortfolios, getPortfolioWithHoldings, getAppSettings, getRetirementSettings } from "@/actions/portfolioActions";

export default async function AllocationPage() {
  const [portfolios, settings, retirementSettings] = await Promise.all([
    getPortfolios(),
    getAppSettings(),
    getRetirementSettings(),
  ]);

  const activeId = settings?.activePortfolioId ?? portfolios[0]?.id ?? null;
  const portfolio = activeId ? await getPortfolioWithHoldings(activeId) : null;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-4">
        <AllocationClient
          portfolio={portfolio}
          retirementSettings={retirementSettings}
        />
      </div>
    </AppShell>
  );
}

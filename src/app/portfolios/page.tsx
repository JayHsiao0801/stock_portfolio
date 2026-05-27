export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { PortfoliosClient } from "@/components/portfolios/PortfoliosClient";
import { getAllPortfoliosWithHoldings, getRetirementSettings } from "@/actions/portfolioActions";

export default async function PortfoliosPage() {
  const [allPortfolios, retirementSettings] = await Promise.all([
    getAllPortfoliosWithHoldings(),
    getRetirementSettings(),
  ]);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-4">
        <PortfoliosClient portfolios={allPortfolios} retirementSettings={retirementSettings} />
      </div>
    </AppShell>
  );
}

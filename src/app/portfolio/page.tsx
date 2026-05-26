export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { PortfolioManager } from "@/components/portfolio/PortfolioManager";
import { getPortfolios, getAppSettings } from "@/actions/portfolioActions";

export default async function PortfolioPage() {
  const [portfolios, settings] = await Promise.all([getPortfolios(), getAppSettings()]);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-4">
        <PortfolioManager
          portfolios={portfolios}
          activePortfolioId={settings?.activePortfolioId ?? null}
        />
      </div>
    </AppShell>
  );
}

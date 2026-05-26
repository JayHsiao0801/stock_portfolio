import { AppShell } from "@/components/layout/AppShell";
import { StockSearchClient } from "@/components/stock/StockSearchClient";

export default function StockSearchPage() {
  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-4">
        <StockSearchClient />
      </div>
    </AppShell>
  );
}

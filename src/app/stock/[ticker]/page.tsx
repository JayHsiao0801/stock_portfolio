import { AppShell } from "@/components/layout/AppShell";
import { StockDetailClient } from "@/components/stock/StockDetailClient";

interface Props {
  params: Promise<{ ticker: string }>;
}

export default async function StockPage({ params }: Props) {
  const { ticker } = await params;
  const decoded = decodeURIComponent(ticker);

  return (
    <AppShell>
      <div className="h-full overflow-hidden">
        <StockDetailClient ticker={decoded} />
      </div>
    </AppShell>
  );
}

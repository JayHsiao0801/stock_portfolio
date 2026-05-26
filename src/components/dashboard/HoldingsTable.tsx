"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, calcUnrealizedPnL } from "@/lib/stock/calculator";
import { deleteHolding } from "@/actions/holdingActions";
import { HoldingFormDialog } from "./HoldingFormDialog";
import type { Holding } from "@/generated/prisma/client";

interface HoldingsTableProps {
  holdings: Holding[];
  portfolioId: string;
  priceMap: Record<string, number>;
  priceLoading?: boolean;
  colorMap?: Record<string, string>;
}

export function HoldingsTable({ holdings, portfolioId, priceMap, priceLoading, colorMap }: HoldingsTableProps) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm("確定刪除此持股？")) return;
    startTransition(() => deleteHolding(id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">持股明細</h2>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={() => { setEditTarget(null); setDialogOpen(true); }}
        >
          <Plus className="h-3 w-3" />
          新增持股
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium h-9 pl-4">股票</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">股數</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">成本</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">現價</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">市值(台幣)</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">損益</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">報酬率</TableHead>
              <TableHead className="w-16 h-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-12">
                  尚無持股，點擊「新增持股」開始
                </TableCell>
              </TableRow>
            )}
            {holdings.map((h) => {
              const currentPrice = priceMap[h.ticker] ?? h.avgCost;
              const { value, pnl, pnlPct } = calcUnrealizedPnL(h.shares, h.avgCost, currentPrice);
              const isProfit = pnl >= 0;

              return (
                <TableRow
                  key={h.id}
                  className="text-xs border-border/40 hover:bg-muted/40 transition-colors group"
                >
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-start gap-2.5">
                      {colorMap?.[h.ticker] && (
                        <div
                          className="mt-[3px] h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ background: colorMap[h.ticker] }}
                        />
                      )}
                      <div>
                        <div className="font-medium text-[13px] leading-tight">{h.name}</div>
                        <div className="text-muted-foreground text-[11px] mt-0.5 font-mono">{h.ticker}</div>
                        {h.sector && (
                          <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 h-4 border-border/60 font-normal">
                            {h.sector}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums py-3">
                    {h.shares.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums py-3 text-muted-foreground">
                    {h.avgCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums py-3">
                    {priceLoading ? (
                      <Skeleton className="h-3 w-14 ml-auto rounded" />
                    ) : (
                      currentPrice.toFixed(2)
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums py-3">
                    {formatCurrency(value)}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums font-medium py-3", isProfit ? "text-profit" : "text-loss")}>
                    <div className="flex items-center justify-end gap-0.5">
                      {isProfit ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatCurrency(Math.abs(pnl))}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums font-semibold py-3", isProfit ? "text-profit" : "text-loss")}>
                    {formatPercent(pnlPct)}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={() => router.push(`/stock/${encodeURIComponent(h.ticker)}`)}
                      >
                        <Search className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={() => { setEditTarget(h); setDialogOpen(true); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(h.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <HoldingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        portfolioId={portfolioId}
        holding={editTarget}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Search, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, calcUnrealizedPnL, calcNetProceeds } from "@/lib/stock/calculator";
import { deleteHolding, updateHoldingOrder } from "@/actions/holdingActions";
import { HoldingFormDialog } from "./HoldingFormDialog";
import type { Holding } from "@/generated/prisma/client";

interface HoldingsTableProps {
  holdings: Holding[];
  portfolioId: string;
  priceMap: Record<string, number>;
  priceLoading?: boolean;
  colorMap?: Record<string, string>;
  brokerageFeeRate?: number;
}

interface RowProps {
  holding: Holding;
  priceMap: Record<string, number>;
  priceLoading?: boolean;
  colorMap?: Record<string, string>;
  brokerageFeeRate: number;
  onEdit: (h: Holding) => void;
  onDelete: (id: string) => void;
  onSearch: (ticker: string) => void;
  isPending: boolean;
}

function SortableRow({
  holding: h,
  priceMap,
  priceLoading,
  colorMap,
  brokerageFeeRate,
  onEdit,
  onDelete,
  onSearch,
  isPending,
}: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: h.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };

  const currentPrice = priceMap[h.ticker] ?? h.avgCost;
  const { value } = calcUnrealizedPnL(h.shares, h.avgCost, currentPrice);
  const netProceeds = calcNetProceeds(value, h.ticker, brokerageFeeRate);
  const trueCost = h.shares * h.avgCost * (1 + brokerageFeeRate / 100);
  const pnl = netProceeds - trueCost;
  const pnlPct = trueCost > 0 ? (pnl / trueCost) * 100 : 0;
  const isProfit = pnl >= 0;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="text-xs border-border/40 hover:bg-muted/40 transition-colors group"
    >
      {/* 拖拉把手 */}
      <TableCell className="w-6 pl-2 py-3">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing text-muted-foreground transition-opacity touch-none"
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </TableCell>

      <TableCell className="pl-2 py-3">
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
      <TableCell className="text-right tabular-nums py-3 text-muted-foreground">
        {formatCurrency(Number(h.shares) * Number(h.avgCost))}
      </TableCell>
      <TableCell className="text-right tabular-nums py-3">
        {priceLoading ? (
          <Skeleton className="h-3 w-14 ml-auto rounded" />
        ) : (
          currentPrice.toFixed(2)
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums py-3">
        {formatCurrency(netProceeds)}
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
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={() => onSearch(h.ticker)}>
            <Search className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={() => onEdit(h)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(h.id)}
            disabled={isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function HoldingsTable({ holdings, portfolioId, priceMap, priceLoading, colorMap, brokerageFeeRate = 0.1425 }: HoldingsTableProps) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [orderedHoldings, setOrderedHoldings] = useState(holdings);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDelete = (id: string) => {
    if (!confirm("確定刪除此持股？")) return;
    startTransition(() => deleteHolding(id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedHoldings.findIndex((i) => i.id === active.id);
    const newIndex = orderedHoldings.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(orderedHoldings, oldIndex, newIndex);
    setOrderedHoldings(newItems);
    updateHoldingOrder(newItems.map((i) => i.id));
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-6 h-9 pl-2" />
                <TableHead className="text-xs text-muted-foreground font-medium h-9 pl-2">股票</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">股數</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">均價</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">投入成本</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">現價</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">預估收入(台幣)</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">損益</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">報酬率</TableHead>
                <TableHead className="w-16 h-9" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedHoldings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground text-sm py-12">
                    尚無持股，點擊「新增持股」開始
                  </TableCell>
                </TableRow>
              )}
              <SortableContext items={orderedHoldings.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                {orderedHoldings.map((h) => (
                  <SortableRow
                    key={h.id}
                    holding={h}
                    priceMap={priceMap}
                    priceLoading={priceLoading}
                    colorMap={colorMap}
                    brokerageFeeRate={brokerageFeeRate}
                    onEdit={(h) => { setEditTarget(h); setDialogOpen(true); }}
                    onDelete={handleDelete}
                    onSearch={(ticker) => router.push(`/stock/${encodeURIComponent(ticker)}`)}
                    isPending={isPending}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
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

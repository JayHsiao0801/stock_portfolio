"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, CheckCircle, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/appStore";
import { deletePortfolio, setActivePortfolio } from "@/actions/portfolioActions";
import { PortfolioFormDialog } from "./PortfolioFormDialog";
import type { Portfolio } from "@/generated/prisma/client";

type PortfolioWithCount = Portfolio & { _count: { holdings: number } };

interface Props {
  portfolios: PortfolioWithCount[];
  activePortfolioId: string | null;
}

export function PortfolioManager({ portfolios, activePortfolioId }: Props) {
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { setActivePortfolioId } = useAppStore();

  const handleDelete = (id: string) => {
    if (!confirm("確定刪除此投資組合？持股資料也會一併刪除。")) return;
    startTransition(() => deletePortfolio(id));
  };

  const handleActivate = (id: string) => {
    setActivePortfolioId(id);
    startTransition(() => setActivePortfolio(id));
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">投資組合</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{portfolios.length} 個組合</p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => { setEditTarget(null); setDialogOpen(true); }}
        >
          <Plus className="h-3 w-3" />
          新增組合
        </Button>
      </div>

      {portfolios.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            尚無投資組合，點擊「新增組合」開始
          </CardContent>
        </Card>
      )}

      {portfolios.map((p) => {
        const isActive = p.id === activePortfolioId;
        return (
          <Card key={p.id} className={isActive ? "border-primary/50" : ""}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  {p.name}
                  {isActive && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                      目前使用
                    </Badge>
                  )}
                </CardTitle>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                )}
              </div>
              <div className="flex gap-1">
                {!isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => handleActivate(p.id)}
                    disabled={isPending}
                  >
                    <CheckCircle className="h-3 w-3" />
                    切換
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => { setEditTarget(p); setDialogOpen(true); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>持股 {p._count.holdings} 檔</span>
                <span>幣別 {p.currency}</span>
                <span>建立 {new Date(p.createdAt).toLocaleDateString("zh-TW")}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <PortfolioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        portfolio={editTarget}
        allPortfolios={portfolios}
      />
    </div>
  );
}

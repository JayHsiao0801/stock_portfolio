"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPortfolio, updatePortfolio, copyPortfolio } from "@/actions/portfolioActions";
import type { Portfolio } from "@/generated/prisma/client";

const schema = z.object({
  name: z.string().min(1, "必填"),
  description: z.string().optional(),
  currency: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio?: Portfolio | null;
  allPortfolios?: Portfolio[];
}

export function PortfolioFormDialog({ open, onOpenChange, portfolio, allPortfolios = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const [copyEnabled, setCopyEnabled] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string>("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { currency: "TWD" },
    values: portfolio
      ? { name: portfolio.name, description: portfolio.description ?? "", currency: portfolio.currency }
      : undefined,
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      if (portfolio) {
        await updatePortfolio(portfolio.id, data);
      } else if (copyEnabled && copySourceId) {
        await copyPortfolio(copySourceId, data);
      } else {
        await createPortfolio(data);
      }
      reset({ currency: "TWD" });
      setCopyEnabled(false);
      setCopySourceId("");
      onOpenChange(false);
    });
  };

  const isNew = !portfolio;
  const copyableSources = allPortfolios.filter((p) => p.id !== portfolio?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {portfolio ? "編輯投資組合" : "新增投資組合"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">名稱</label>
            <Input {...register("name")} className="h-8 text-sm" placeholder="例：主力帳戶" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">說明（選填）</label>
            <Input {...register("description")} className="h-8 text-sm" placeholder="備注說明" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">基準幣別</label>
            <Input {...register("currency")} className="h-8 text-sm" placeholder="TWD" />
          </div>

          {/* 複製功能：僅在新增時顯示 */}
          {isNew && copyableSources.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-primary h-3.5 w-3.5"
                  checked={copyEnabled}
                  onChange={(e) => {
                    setCopyEnabled(e.target.checked);
                    if (!e.target.checked) setCopySourceId("");
                  }}
                />
                <span className="text-xs text-muted-foreground">從現有組合複製持股</span>
              </label>
              {copyEnabled && (
                <select
                  value={copySourceId}
                  onChange={(e) => setCopySourceId(e.target.value)}
                  className="w-full h-8 text-sm bg-input border border-border rounded-md px-2 text-foreground"
                >
                  <option value="">選擇來源組合…</option>
                  {copyableSources.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={isPending || (copyEnabled && !copySourceId)}>
              {isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

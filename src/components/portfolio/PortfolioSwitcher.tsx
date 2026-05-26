"use client";

import { useTransition } from "react";
import { ChevronDown, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import { setActivePortfolio } from "@/actions/portfolioActions";
import type { Portfolio } from "@/generated/prisma/client";

interface PortfolioSwitcherProps {
  portfolios: Portfolio[];
}

export function PortfolioSwitcher({ portfolios }: PortfolioSwitcherProps) {
  const { activePortfolioId, setActivePortfolioId } = useAppStore();
  const [isPending, startTransition] = useTransition();

  const current = portfolios.find((p) => p.id === activePortfolioId) ?? portfolios[0];

  const handleSwitch = (id: string) => {
    setActivePortfolioId(id);
    startTransition(() => setActivePortfolio(id));
  };

  if (portfolios.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <FolderOpen className="h-4 w-4" />
        <span>尚無投資組合</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" className="gap-2 text-sm font-medium" disabled={isPending}>
          <FolderOpen className="h-4 w-4" />
          {current?.name ?? "選擇組合"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      } />
      <DropdownMenuContent align="start" className="w-48">
        {portfolios.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => handleSwitch(p.id)}
            className={p.id === current?.id ? "font-medium" : ""}
          >
            {p.name}
            {p.id === current?.id && (
              <span className="ml-auto text-xs text-muted-foreground">目前</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { window.location.href = "/portfolio"; }}>
          管理投資組合
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

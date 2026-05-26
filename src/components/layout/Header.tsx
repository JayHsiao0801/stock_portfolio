"use client";

import { usePathname } from "next/navigation";
import { MessageSquare, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import { PortfolioSwitcher } from "@/components/portfolio/PortfolioSwitcher";
import type { Portfolio } from "@/generated/prisma/client";

interface HeaderProps {
  portfolios: Portfolio[];
}

export function Header({ portfolios }: HeaderProps) {
  const { isChatOpen, toggleChat } = useAppStore();
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between h-14 px-5 bg-background shrink-0 sticky top-0 z-10">
      {pathname !== "/portfolios" && <PortfolioSwitcher portfolios={portfolios} />}
      {pathname === "/portfolios" && <div />}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          title={isChatOpen ? "關閉 AI 聊天" : "開啟 AI 聊天"}
        >
          {isChatOpen ? (
            <MessageSquareOff className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}

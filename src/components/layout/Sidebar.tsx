"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Briefcase, Settings, TrendingUp, PieChart, Layers2, MessageSquare, MessageSquareOff, BookOpen, ChartCandlestick } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";

const nav = [
  { href: "/portfolios", label: "各組合重點", icon: Layers2 },
  { href: "/", label: "股票配置", icon: BarChart2 },
  { href: "/allocation", label: "總資產配置", icon: PieChart },
  { href: "/portfolio", label: "投資組合", icon: Briefcase },
  { href: "/stock", label: "個股查詢", icon: ChartCandlestick },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isChatOpen, toggleChat } = useAppStore();

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14">
        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/15">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="font-semibold text-sm tracking-tight">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "Stock Portfolio"}
        </span>
      </div>

      {/* 導覽 */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
              (href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/"))
                ? "bg-primary/[0.12] text-primary font-medium dark:metal-shine"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3 space-y-1">
        <Link
          href="/guide"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
            pathname === "/guide"
              ? "bg-primary/[0.12] text-primary font-medium dark:metal-shine"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          使用說明
        </Link>
        <button
          onClick={toggleChat}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150",
            isChatOpen
              ? "bg-primary/[0.12] text-primary font-medium dark:metal-shine"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          )}
        >
          {isChatOpen ? <MessageSquareOff className="h-4 w-4 shrink-0" /> : <MessageSquare className="h-4 w-4 shrink-0" />}
          AI 助理
        </button>
        <div className="px-2 pt-1">
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">v1.4.1</span>
        </div>
      </div>
    </aside>
  );
}

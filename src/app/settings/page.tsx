export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import { MarketModeToggle } from "@/components/settings/MarketModeToggle";
import { getEnvKeyStatus } from "@/actions/envActions";
import { getRetirementSettings } from "@/actions/portfolioActions";

export default async function SettingsPage() {
  const [claude, gemini, groq, settings] = await Promise.all([
    getEnvKeyStatus("ANTHROPIC_API_KEY"),
    getEnvKeyStatus("GOOGLE_GENERATIVE_AI_API_KEY"),
    getEnvKeyStatus("GROQ_API_KEY"),
    getRetirementSettings(),
  ]);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-4">
        <div className="max-w-lg space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">設定</h1>
              <p className="text-xs text-muted-foreground mt-0.5">外觀、AI 金鑰與資料來源</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">外觀</h2>
            <ThemeToggle />
          </div>

          <ApiKeySettings
            claudeSet={claude.set}
            claudePreview={claude.preview}
            geminiSet={gemini.set}
            geminiPreview={gemini.preview}
            groqSet={groq.set}
            groqPreview={groq.preview}
          />

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">股價資料</h2>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="h-2 w-2 rounded-full bg-profit shrink-0" />
              <div>
                <div className="text-sm font-medium">Yahoo Finance</div>
                <div className="text-xs text-muted-foreground">
                  免費使用，不需要 API Key，每 5 分鐘自動更新
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">股票搜尋市場</h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">影響新增持股時的搜尋結果</p>
            </div>
            <MarketModeToggle initial={settings.stockMarket} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

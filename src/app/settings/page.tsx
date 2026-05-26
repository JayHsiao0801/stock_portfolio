export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Info, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";

export default async function SettingsPage() {
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-4">
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">設定</h1>
              <p className="text-xs text-muted-foreground mt-0.5">API 金鑰與資料來源</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">外觀</h2>
            <ThemeToggle />
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">AI 金鑰狀態</h2>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              {hasClaude ? (
                <CheckCircle className="h-4 w-4 text-profit shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-loss shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium">Anthropic Claude</div>
                <div className="text-xs text-muted-foreground">
                  {hasClaude ? "已設定（.env ANTHROPIC_API_KEY）" : "未設定"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              {hasGemini ? (
                <CheckCircle className="h-4 w-4 text-profit shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-loss shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium">Google Gemini</div>
                <div className="text-xs text-muted-foreground">
                  {hasGemini
                    ? "已設定（.env GOOGLE_GENERATIVE_AI_API_KEY）"
                    : "未設定"}
                </div>
              </div>
            </div>

            {!hasClaude && !hasGemini && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  在 <code className="font-mono">.env</code> 填入至少一組 API Key 才能使用 AI 聊天功能。
                  參考 <code className="font-mono">.env.example</code> 了解格式。
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">股價資料</h2>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <CheckCircle className="h-4 w-4 text-profit shrink-0" />
              <div>
                <div className="text-sm font-medium">Yahoo Finance</div>
                <div className="text-xs text-muted-foreground">
                  免費使用，不需要 API Key，每 5 分鐘自動更新
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

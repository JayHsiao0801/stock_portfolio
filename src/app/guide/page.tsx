import { AppShell } from "@/components/layout/AppShell";
import { BookOpen, LayoutDashboard, PieChart, Layers2, Briefcase, DollarSign, MessageSquare, Settings, TrendingUp, AlertCircle, ChartCandlestick, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function Item({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-foreground shrink-0">{label}：</span>
      <span>{desc}</span>
    </div>
  );
}

export default function GuidePage() {
  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-4">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">使用說明書</h1>
              <p className="text-xs text-muted-foreground mt-0.5">各功能操作說明</p>
            </div>
          </div>

          <Section icon={Layers2} title="各組合重點">
            <Item label="用途" desc="一覽所有投資組合的摘要，包含總資產、成本、配息、貸款金額與占總資產比例。" />
            <Item label="切換組合" desc="點擊任一卡片即可將該組合設為目前使用組合，並自動跳轉到股票配置頁。" />
            <Item label="配息顯示" desc="配息數值來自「總資產配置 → 配息」區塊設定的年化殖利率，尚未輸入殖利率時顯示「—」。" />
          </Section>

          <Section icon={LayoutDashboard} title="股票配置">
            <Item label="用途" desc="顯示目前選定組合的所有持股，包含各股現價、預估收入、未實現損益與報酬率。" />
            <Item label="預估收入" desc="賣出後實際入帳的估算金額，已扣除手續費（預設 0.1425%）與交易稅（台股 0.3%、台股 ETF 0.1%、美股 0%）。" />
            <Item label="損益 / 報酬率" desc="以「預估收入 − 含買入手續費成本」計算，與券商顯示的損益一致。" />
            <Item label="排序" desc="滑鼠移到持股列，左側出現拖拉把手（⠿），按住拖曳可調整順序，放開後自動儲存。" />
            <Item label="新增持股" desc="點擊右上角「新增持股」，在股票代號欄輸入後會出現搜尋下拉選單，選取後自動帶入名稱與幣別。也可手動填入代號、股數、平均成本。" />
            <Item label="編輯 / 刪除 / 查詢" desc="滑鼠移到持股列上，右側會出現放大鏡（查詢）、鉛筆（編輯）、垃圾桶（刪除）三個按鈕。" />
            <Item label="股價更新" desc="頁面載入後自動從 Yahoo Finance 取得即時報價，之後每 5 分鐘自動更新一次。" />
          </Section>

          <Section icon={PieChart} title="總資產配置">
            <Item label="用途" desc="顯示目前組合的資產分布圓餅圖（台股 / 美股分開顯示），以及各項財務指標摘要卡片。" />
            <Item label="資產配置圖" desc="左側顯示台股（.TW / .TWO）持股分布，右側顯示美股持股分布，各自列出個股佔總資產的比例與該類別小計。" />
            <Item label="流動預備金" desc="點擊該卡片可直接編輯預留的現金金額，會計入「總資產」但不會影響持股損益計算。Enter 確認，Esc 取消。" />
            <Item label="年配息卡片" desc="主要數字為稅後配息，下方小字為稅前，稅率在「退休規劃參考 → 設定」中調整。" />
            <Item label="配息區塊" desc="對每檔持股輸入預期年化殖利率（%），輸入後 0.6 秒自動儲存，也可按 Tab 移到下一欄立即存入。配息以市值計算，非預估收入。" />
            <Item label="退休規劃參考" desc="點擊右上角「設定」可設定稅率、匯率、每月生活費目標與手續費率，系統計算 FIRE 達成率（稅後月配息 ÷ 每月生活費）。" />
            <Item label="貸款" desc="點擊右上角「編輯」可輸入貸款金額、年利率與還款期數（支援月 / 年切換），儲存後顯示在剩餘貸款卡片。" />
          </Section>

          <Section icon={ChartCandlestick} title="個股查詢">
            <Item label="入口" desc="側邊欄「個股查詢」或持股列右側的放大鏡按鈕皆可進入。" />
            <Item label="搜尋" desc="輸入股票代號或名稱關鍵字，搜尋結果即時顯示，點選後進入該股票頁面。" />
            <Item label="K 線圖" desc="使用 lightweight-charts 顯示日 K 線圖與成交量，支援 1m、3m、6m、1y、2y、5y 時間範圍切換。" />
            <Item label="漲跌顏色" desc="台股慣例紅漲綠跌；美股為綠漲紅跌，系統依股票代號自動判斷。" />
            <Item label="基本資訊" desc="右側面板顯示今日開高低量、市值、52 週高低、本益比、EPS、殖利率。" />
          </Section>

          <Section icon={Briefcase} title="投資組合">
            <Item label="用途" desc="管理多個投資組合，可新增、編輯名稱與說明，或刪除整個組合（含所有持股）。" />
            <Item label="多組合" desc="可建立多個組合，例如「主力帳戶」、「退休帳戶」。各組合資料彼此獨立。" />
          </Section>

          <Section icon={DollarSign} title="股票代號格式">
            <Item label="台灣上市（TWSE）" desc="代號後加 .TW，例如 2330.TW、0050.TW" />
            <Item label="台灣上櫃（TPEx）" desc="代號後加 .TWO，例如 6781.TWO" />
            <Item label="ETF（上市）" desc="同上市格式：00878.TW、0056.TW" />
            <Item label="美股" desc="直接填代號：AAPL、NVDA、VOO" />
          </Section>

          <Section icon={TrendingUp} title="殖利率與配息計算方式">
            <p>年配息 = 各股市值 × 年化殖利率 %</p>
            <p>稅後配息 = 年配息 × (1 − 配息稅率 %)</p>
            <p>FIRE 達成率 = (稅後月配息 ÷ 每月生活費目標) × 100%</p>
            <p className="pt-1 text-muted-foreground/70">殖利率為預估值，需手動輸入，系統不會自動爬取股息資料。</p>
          </Section>

          <Section icon={TrendingUp} title="預估收入計算方式">
            <p>預估收入 = 市值 × (1 − 手續費率% − 交易稅%)</p>
            <p>交易稅：台股 0.3%、台股 ETF 0.1%、美股 0%</p>
            <p>損益 = 預估收入 − 含買入手續費成本</p>
            <p>含買入手續費成本 = 股數 × 平均成本 × (1 + 手續費率%)</p>
            <p className="pt-1 text-muted-foreground/70">手續費率預設 0.1425%，可在「退休規劃設定」依券商折扣調整。</p>
          </Section>

          <Section icon={MessageSquare} title="AI 助理">
            <Item label="開啟方式" desc="點擊左側側邊欄底部的「AI 助理」按鈕，聊天面板會從右側滑入。" />
            <Item label="支援模型" desc="目前支援 Anthropic Claude 與 Google Gemini，需在設定頁輸入對應的 API Key。" />
            <Item label="用途建議" desc="可詢問股票分析、投資策略建議，或請 AI 解讀目前組合的配置狀況。" />
          </Section>

          <Section icon={Settings} title="設定">
            <Item label="外觀" desc="支援淺色、深色、跟隨系統三種模式，可在設定頁切換。" />
            <Item label="AI 金鑰" desc="直接在設定頁輸入或移除 ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY，儲存後點「立即重啟」即可生效，無需手動編輯 .env 檔案。" />
            <Item label="手續費率" desc="在「總資產配置 → 退休規劃設定」中調整，預設 0.1425%。依券商折扣輸入實際費率即可。" />
            <Item label="股價來源" desc="使用 Yahoo Finance 免費 API，不需要 Key。App 每 5 分鐘向 Yahoo Finance 重新抓取一次；Yahoo Finance 免費方案本身的報價相對交易所可能有最多 15 分鐘延遲。" />
          </Section>

          <Section icon={AlertCircle} title="注意事項">
            <Item label="資料儲存" desc="所有資料存在本機 SQLite（prisma/dev.db），不會上傳雲端，重新部署前請備份此檔案。" />
            <Item label="股價延遲" desc="App 每 5 分鐘重新抓取股價；Yahoo Finance 免費報價本身相對交易所可能有最多 15 分鐘延遲，僅供參考，不適合做即時交易依據。" />
            <Item label="損益計算" desc="目前僅計算未實現損益，不追蹤已實現損益（賣出紀錄）。" />
            <Item label="預估收入誤差" desc="手續費率若與券商實際折扣不同，預估收入會有些微差距，請在退休規劃設定中調整至實際費率。" />
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

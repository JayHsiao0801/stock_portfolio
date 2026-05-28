"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Holding } from "@/generated/prisma/client";

export const COLORS = [
  "#0A84FF",
  "#30D158",
  "#FF9F0A",
  "#FF453A",
  "#BF5AF2",
  "#5AC8FA",
  "#FF2D55",
  "#FFD60A",
];

const TW_COLORS = ["#0A84FF","#5AC8FA","#BF5AF2","#FF2D55","#FFD60A","#30D158","#FF9F0A","#FF453A"];
const US_COLORS = ["#FF9F0A","#30D158","#FF453A","#BF5AF2","#5AC8FA","#0A84FF","#FFD60A","#FF2D55"];
const CN_COLORS = ["#FF2D55","#FF9F0A","#FFD60A","#30D158","#0A84FF","#BF5AF2","#5AC8FA","#FF453A"];

const fmt = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

interface Props {
  holdings: Holding[];
  priceMap: Record<string, number>;
}

interface DataPoint {
  name: string;
  ticker: string;
  value: number;
}

function CustomTooltip({
  active,
  payload,
  isDark,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DataPoint }>;
  isDark: boolean;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div
      style={{
        background: isDark ? "rgba(22,22,24,0.92)" : "rgba(255,255,255,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.10)",
        borderRadius: "12px",
        padding: "10px 14px",
        boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)", marginBottom: 3 }}>
        {d.name}
      </div>
      <div style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>{fmt.format(d.value)}</div>
    </div>
  );
}

function MiniDonut({
  data,
  colors,
  total,
  label,
  isDark,
  shadow,
  strokeColor,
  textPrimary,
  textMuted,
  textSecondary,
  dividerColor,
}: {
  data: DataPoint[];
  colors: string[];
  total: number;
  label: string;
  isDark: boolean;
  shadow: string;
  strokeColor: string;
  textPrimary: string;
  textMuted: string;
  textSecondary: string;
  dividerColor: string;
}) {
  const categoryTotal = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs py-8">
        無{label}持股
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex items-center gap-5">
      {/* 圓環 */}
      <div className="relative shrink-0" style={{ height: 148, width: 148 }}>
        <div className="absolute inset-0" style={{ filter: shadow }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {colors.map((color, i) => (
                  <linearGradient key={i} id={`pie-${label}-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.78} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={43}
                outerRadius={66}
                paddingAngle={0}
                cornerRadius={5}
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={isDark ? 3 : 1.5}
                startAngle={90}
                endAngle={-270}
                animationBegin={0}
                animationDuration={700}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#pie-${label}-grad-${i % colors.length})`} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="tabular-nums font-bold leading-none" style={{ fontSize: 18, color: textPrimary }}>
            {data.length}
          </span>
          <span style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>
            檔{label}
          </span>
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex-1 min-w-0 space-y-2">
        {data.map((d, i) => {
          const pct = categoryTotal > 0 ? (d.value / categoryTotal) * 100 : 0;
          const color = colors[i % colors.length];
          return (
            <div key={`${d.ticker}-${i}`} className="flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
              <span className="truncate flex-1 text-xs" style={{ color: textSecondary }}>
                {d.name}
              </span>
              <span className="text-xs font-semibold tabular-nums shrink-0 w-11 text-right" style={{ color: textPrimary }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
        <div className="pt-2 mt-0.5 flex items-center justify-between" style={{ borderTop: `1px solid ${dividerColor}` }}>
          <span style={{ fontSize: 10, color: textMuted }}>{label}小計</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: textPrimary }}>
            {fmt.format(categoryTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AllocationPieChart({ holdings, priceMap }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const textPrimary = isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.82)";
  const textSecondary = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.45)";
  const textMuted = isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.30)";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const strokeColor = isDark ? "#0d0d0d" : "rgba(255,255,255,0.6)";
  const shadow = isDark
    ? "drop-shadow(0 12px 28px rgba(0,0,0,0.70)) drop-shadow(0 3px 8px rgba(0,0,0,0.45))"
    : "drop-shadow(0 6px 16px rgba(0,0,0,0.14)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))";

  const allData: DataPoint[] = holdings
    .map((h) => ({
      name: h.name,
      ticker: h.ticker,
      value: Number(h.shares) * (priceMap[h.ticker] ?? Number(h.avgCost)),
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // 同時更新 colorMap 用的 COLORS（依全部排序決定顏色，保持跟 holdings table 一致）
  const twData = allData.filter((d) => d.ticker.endsWith(".TW") || d.ticker.endsWith(".TWO"));
  const cnData = allData.filter((d) => d.ticker.endsWith(".SS") || d.ticker.endsWith(".SZ"));
  const usData = allData.filter((d) =>
    !d.ticker.endsWith(".TW") && !d.ticker.endsWith(".TWO") &&
    !d.ticker.endsWith(".SS") && !d.ticker.endsWith(".SZ")
  );
  const total = allData.reduce((s, d) => s + d.value, 0);

  const sharedProps = { total, isDark, shadow, strokeColor, textPrimary, textMuted, textSecondary, dividerColor };
  const groups = [
    { data: twData, colors: TW_COLORS, label: "台股" },
    { data: cnData, colors: CN_COLORS, label: "A股" },
    { data: usData, colors: US_COLORS, label: "美股" },
  ].filter((g) => g.data.length > 0);

  if (allData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium tracking-tight">資產配置</CardTitle>
        </CardHeader>
        <CardContent className="h-36 flex items-center justify-center text-muted-foreground text-sm">
          尚無持股資料
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium tracking-tight">資產配置</CardTitle>
          <span className="text-xs tabular-nums font-semibold" style={{ color: textPrimary }}>
            總計 {fmt.format(total)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex gap-6 flex-wrap">
          {groups.map((g, i) => (
            <React.Fragment key={g.label}>
              <MiniDonut data={g.data} colors={g.colors} label={g.label} {...sharedProps} />
              {i < groups.length - 1 && (
                <div className="w-px self-stretch" style={{ background: dividerColor }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

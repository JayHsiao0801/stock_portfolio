"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, RotateCcw, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setEnvKey, removeEnvKey, restartServer } from "@/actions/envActions";

function RestartBanner() {
  const [restarting, setRestarting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRestart = () => {
    setRestarting(true);
    startTransition(async () => {
      await restartServer();
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
      <span className="text-amber-600 dark:text-amber-400">
        {restarting ? "重啟中，請稍候…" : "已儲存，需重啟伺服器才能生效"}
      </span>
      {!restarting && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          onClick={handleRestart}
          disabled={isPending}
        >
          <RefreshCw className="h-3 w-3" />
          立即重啟
        </Button>
      )}
    </div>
  );
}

interface KeyRowProps {
  label: string;
  envKey: string;
  isSet: boolean;
  preview: string | null;
  onChanged: () => void;
}

function KeyRow({ label, envKey, isSet: initialSet, preview: initialPreview, onChanged }: KeyRowProps) {
  const [isSet, setIsSet] = useState(initialSet);
  const [preview, setPreview] = useState(initialPreview);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!inputValue.trim()) return;
    startTransition(async () => {
      await setEnvKey(envKey, inputValue.trim());
      const masked = inputValue.length > 8
        ? inputValue.slice(0, 6) + "••••••••" + inputValue.slice(-4)
        : "••••••••••••";
      setIsSet(true);
      setPreview(masked);
      setInputValue("");
      setEditing(false);
      onChanged();
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeEnvKey(envKey);
      setIsSet(false);
      setPreview(null);
      setEditing(false);
      setInputValue("");
      onChanged();
    });
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{envKey}</div>
        </div>
        {isSet ? (
          <span className="text-[11px] bg-profit/10 text-profit px-2 py-0.5 rounded-full font-medium">已設定</span>
        ) : (
          <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">未設定</span>
        )}
      </div>

      {isSet && !editing && (
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate">
            {showPreview ? preview : "••••••••••••••••••••"}
          </code>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => setEditing(true)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={handleRemove}
            disabled={isPending}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {(!isSet || editing) && (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={`貼上 ${envKey}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-8 text-xs font-mono flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setEditing(false); setInputValue(""); }
            }}
            autoFocus
          />
          <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleSave} disabled={!inputValue.trim() || isPending}>
            儲存
          </Button>
          {editing && (
            <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { setEditing(false); setInputValue(""); }}>
              取消
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  claudeSet: boolean;
  claudePreview: string | null;
  geminiSet: boolean;
  geminiPreview: string | null;
}

export function ApiKeySettings({ claudeSet, claudePreview, geminiSet, geminiPreview }: Props) {
  const [needsRestart, setNeedsRestart] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">AI 金鑰</h2>
      <KeyRow
        label="Anthropic Claude"
        envKey="ANTHROPIC_API_KEY"
        isSet={claudeSet}
        preview={claudePreview}
        onChanged={() => setNeedsRestart(true)}
      />
      <KeyRow
        label="Google Gemini"
        envKey="GOOGLE_GENERATIVE_AI_API_KEY"
        isSet={geminiSet}
        preview={geminiPreview}
        onChanged={() => setNeedsRestart(true)}
      />
      {needsRestart && <RestartBanner />}
    </div>
  );
}

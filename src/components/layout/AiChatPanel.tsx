"use client";

import { useRef, useEffect } from "react";
import { Send, Bot, User, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import ReactMarkdown from "react-markdown";

interface AiChatPanelProps {
  availableProviders: { claude: boolean; gemini: boolean };
  portfolioContext: string;
}

export function AiChatPanel({ availableProviders, portfolioContext }: AiChatPanelProps) {
  const { aiProvider, setAiProvider, chatMessages, setChatMessages, clearChatMessages } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasAny = availableProviders.claude || availableProviders.gemini;
  const effectiveProvider =
    aiProvider === "claude" && availableProviders.claude
      ? "claude"
      : aiProvider === "gemini" && availableProviders.gemini
        ? "gemini"
        : availableProviders.claude
          ? "claude"
          : availableProviders.gemini
            ? "gemini"
            : null;

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useStreamingChat({
    api: "/api/chat",
    body: { provider: effectiveProvider, portfolioContext },
    initialMessages: chatMessages,
    onMessagesChange: setChatMessages,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToggle = availableProviders.claude && availableProviders.gemini;

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/15">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium tracking-tight">AI 助理</span>
        </div>

        <div className="flex items-center gap-1">
        {messages.length > 0 && (
          <button
            onClick={clearChatMessages}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title="清除對話"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {showToggle && (
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            {(["claude", "gemini"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setAiProvider(p)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 capitalize",
                  effectiveProvider === p
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {!showToggle && effectiveProvider && (
          <span className="text-[11px] text-muted-foreground capitalize font-medium">
            {effectiveProvider}
          </span>
        )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasAny && (
          <Alert className="border-border/60 bg-white/[0.03]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              尚未設定 AI API Key。請至側邊欄「設定」頁面輸入{" "}
              <code className="font-mono bg-white/10 px-1 rounded">ANTHROPIC_API_KEY</code> 或{" "}
              <code className="font-mono bg-white/10 px-1 rounded">GOOGLE_GENERATIVE_AI_API_KEY</code>。
            </AlertDescription>
          </Alert>
        )}

        {messages.length === 0 && hasAny && (
          <div className="flex flex-col items-center gap-2 mt-8 text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
              您好！我了解您的投資組合，可以詢問我任何問題。
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex gap-2.5", m.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            <div className="shrink-0 mt-0.5">
              {m.role === "user" ? (
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 text-xs max-w-[85%] leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-white rounded-tr-sm"
                  : "bg-white/[0.06] text-foreground rounded-tl-sm border border-white/[0.06]"
              )}
            >
              <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:text-xs [&_p]:my-1 [&_li]:text-xs [&_p]:leading-relaxed">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-2.5">
            <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="bg-white/[0.06] border border-white/[0.06] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <div className="flex gap-1 items-center h-4">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 px-4 py-3 shrink-0"
      >
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={hasAny ? "詢問關於您的投資組合…" : "請先設定 API Key"}
          disabled={!hasAny || isLoading}
          className="text-xs h-9 bg-white/[0.06] border-white/[0.08] rounded-xl focus-visible:ring-primary/40 placeholder:text-muted-foreground/50"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90"
          disabled={!hasAny || isLoading || !input.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}

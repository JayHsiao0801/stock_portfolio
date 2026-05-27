"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useStreamingChat(options: {
  api: string;
  body?: Record<string, unknown>;
  initialMessages?: ChatMessage[];
  onMessagesChange?: (msgs: ChatMessage[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const onChangeRef = useRef(options.onMessagesChange);
  onChangeRef.current = options.onMessagesChange;

  useEffect(() => {
    onChangeRef.current?.(messages);
  }, [messages]);

  const sendMessage = useCallback(
    async (userContent: string, extraBody?: Record<string, unknown>) => {
      if (!userContent.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setIsLoading(true);

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const res = await fetch(options.api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            ...options.body,
            ...extraBody,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }

        if (!accumulated.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "❌ AI 未回應，可能是 API 額度不足（429）或網路問題，請稍後再試。" }
                : m
            )
          );
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "發生錯誤";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `❌ ${errMsg}` }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options.api, options.body]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent, extraBody?: Record<string, unknown>) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      const msg = input;
      setInput("");
      sendMessage(msg, extraBody);
    },
    [input, isLoading, sendMessage]
  );

  return { messages, input, handleInputChange, handleSubmit, isLoading, sendMessage };
}

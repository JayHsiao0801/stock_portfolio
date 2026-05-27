"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "@/hooks/useStreamingChat";

interface AppState {
  activePortfolioId: string | null;
  aiProvider: "claude" | "gemini" | "groq";
  isChatOpen: boolean;
  portfolioContext: string;
  chatMessages: ChatMessage[];
  setActivePortfolioId: (id: string | null) => void;
  setAiProvider: (provider: "claude" | "gemini" | "groq") => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setPortfolioContext: (ctx: string) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  clearChatMessages: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activePortfolioId: null,
      aiProvider: "claude",
      isChatOpen: true,
      portfolioContext: "",
      chatMessages: [],
      setActivePortfolioId: (id) => set({ activePortfolioId: id }),
      setAiProvider: (provider) => set({ aiProvider: provider }),
      toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
      setChatOpen: (open) => set({ isChatOpen: open }),
      setPortfolioContext: (ctx) => set({ portfolioContext: ctx }),
      setChatMessages: (msgs) => set({ chatMessages: msgs.slice(-100) }),
      clearChatMessages: () => set({ chatMessages: [] }),
    }),
    { name: "stock-app-store", partialize: (s) => ({
      activePortfolioId: s.activePortfolioId,
      aiProvider: s.aiProvider,
      isChatOpen: s.isChatOpen,
      chatMessages: s.chatMessages,
    }) }
  )
);

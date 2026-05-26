"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  activePortfolioId: string | null;
  aiProvider: "claude" | "gemini";
  isChatOpen: boolean;
  portfolioContext: string;
  setActivePortfolioId: (id: string | null) => void;
  setAiProvider: (provider: "claude" | "gemini") => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setPortfolioContext: (ctx: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activePortfolioId: null,
      aiProvider: "claude",
      isChatOpen: true,
      portfolioContext: "",
      setActivePortfolioId: (id) => set({ activePortfolioId: id }),
      setAiProvider: (provider) => set({ aiProvider: provider }),
      toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
      setChatOpen: (open) => set({ isChatOpen: open }),
      setPortfolioContext: (ctx) => set({ portfolioContext: ctx }),
    }),
    { name: "stock-app-store", partialize: (s) => ({
      activePortfolioId: s.activePortfolioId,
      aiProvider: s.aiProvider,
      isChatOpen: s.isChatOpen,
    }) }
  )
);

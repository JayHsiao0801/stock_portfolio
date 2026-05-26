"use client";

import { useAppStore } from "@/store/appStore";
import { AiChatPanel } from "./AiChatPanel";

interface Props {
  availableProviders: { claude: boolean; gemini: boolean };
}

export function ChatPanelShell({ availableProviders }: Props) {
  const { isChatOpen, portfolioContext } = useAppStore();
  if (!isChatOpen) return null;

  return (
    <div className="w-80 shrink-0 flex flex-col overflow-hidden border-l border-border/40">
      <AiChatPanel availableProviders={availableProviders} portfolioContext={portfolioContext} />
    </div>
  );
}

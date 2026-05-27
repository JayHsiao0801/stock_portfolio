import { Sidebar } from "./Sidebar";
import { ChatPanelShell } from "./ChatPanelShell";
import { getEnvValue } from "@/lib/envUtils";

interface Props {
  children: React.ReactNode;
}

export async function AppShell({ children }: Props) {
  const availableProviders = {
    claude: !!getEnvValue("ANTHROPIC_API_KEY"),
    gemini: !!getEnvValue("GOOGLE_GENERATIVE_AI_API_KEY"),
    groq: !!getEnvValue("GROQ_API_KEY"),
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
        <ChatPanelShell availableProviders={availableProviders} />
      </div>
    </div>
  );
}

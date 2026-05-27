import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getEnvValue } from "@/lib/envUtils";

export function getClaudeModel() {
  const key = getEnvValue("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const anthropic = createAnthropic({ apiKey: key });
  return anthropic("claude-haiku-4-5-20251001");
}

export function getGeminiModel() {
  const key = getEnvValue("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");
  const google = createGoogleGenerativeAI({ apiKey: key });
  return google("gemini-2.0-flash");
}

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getClaudeModel() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic("claude-sonnet-4-6");
}

export function getGeminiModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return google("gemini-2.0-flash");
}

import { streamText } from "ai";
import { NextRequest } from "next/server";
import { getClaudeModel, getGeminiModel } from "@/lib/ai/providers";

export async function POST(req: NextRequest) {
  const { messages, provider, portfolioContext } = await req.json();

  let model;
  try {
    if (provider === "gemini") {
      model = getGeminiModel();
    } else {
      model = getClaudeModel();
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "API Key 未設定";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `你是一位專業的股票投資顧問助理，協助使用者分析其投資組合。
請用繁體中文回答，保持專業但親切的語氣。

${portfolioContext ? `使用者目前的投資組合資訊：\n${portfolioContext}` : ""}

請注意：不要提供具體的買賣建議，而是提供客觀的分析與資訊。`;

  const result = streamText({ model, system: systemPrompt, messages });
  return result.toTextStreamResponse();
}

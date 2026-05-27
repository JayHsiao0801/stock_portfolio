import { streamText } from "ai";
import { NextRequest } from "next/server";
import { getClaudeModel } from "@/lib/ai/providers";
import { getEnvValue } from "@/lib/envUtils";

const SYSTEM_PROMPT_BASE = `你是一位專業的股票投資顧問助理，協助使用者分析其投資組合。
請用繁體中文回答，保持專業但親切的語氣。

請注意：不要提供具體的買賣建議，而是提供客觀的分析與資訊。`;

export async function POST(req: NextRequest) {
  const { messages, provider, portfolioContext } = await req.json();

  const systemPrompt = SYSTEM_PROMPT_BASE +
    (portfolioContext ? `\n\n使用者目前的投資組合資訊：\n${portfolioContext}` : "");

  if (provider === "gemini") {
    return streamGemini(messages, systemPrompt);
  }

  if (provider === "groq") {
    return streamGroq(messages, systemPrompt);
  }

  // Claude via AI SDK
  let model;
  try {
    model = getClaudeModel();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "ANTHROPIC_API_KEY 未設定";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    onError: (event) => console.error("[chat] claude error:", event.error),
  });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(enc.encode(chunk));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "stream error";
        console.error("[chat] claude stream error:", e);
        controller.enqueue(enc.encode(`❌ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function streamGroq(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<Response> {
  const key = getEnvValue("GROQ_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY 未設定" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
  };

  let groqRes: globalThis.Response;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "網路錯誤";
    console.error("[chat] groq fetch error:", e);
    return new Response(`❌ ${msg}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  if (!groqRes.ok || !groqRes.body) {
    const errText = await groqRes.text().catch(() => "");
    console.error("[chat] groq error response:", errText);
    return new Response(`❌ Groq ${groqRes.status}: ${errText}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const text: string = parsed?.choices?.[0]?.delta?.content ?? "";
              if (text) controller.enqueue(enc.encode(text));
            } catch {
              // skip malformed SSE line
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "stream error";
        console.error("[chat] groq stream error:", e);
        controller.enqueue(enc.encode(`❌ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function streamGemini(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<Response> {
  const key = getEnvValue("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY 未設定" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 1, topP: 0.95 },
  };

  let geminiRes: globalThis.Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${key}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "網路錯誤";
    console.error("[chat] gemini fetch error:", e);
    return new Response(`❌ ${msg}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const errText = await geminiRes.text().catch(() => "");
    console.error("[chat] gemini error response:", errText);
    return new Response(`❌ Gemini ${geminiRes.status}: ${errText}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const reader = geminiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const text: string =
                parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (text) controller.enqueue(enc.encode(text));
            } catch {
              // skip malformed SSE line
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "stream error";
        console.error("[chat] gemini stream error:", e);
        controller.enqueue(enc.encode(`❌ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

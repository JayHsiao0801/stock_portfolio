import { NextRequest } from "next/server";
import { getEnvValue } from "@/lib/envUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") ?? "gemini";

  if (provider === "gemini") {
    const key = getEnvValue("GOOGLE_GENERATIVE_AI_API_KEY");
    if (!key) return Response.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY not set" }, { status: 400 });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=50`
    );
    const data = await res.json();
    const names = (data.models ?? []).map((m: { name: string }) => m.name);
    return Response.json({ status: res.status, availableModels: names, raw: data });
  }

  if (provider === "claude") {
    const key = getEnvValue("ANTHROPIC_API_KEY");
    if (!key) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 400 });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    const data = await res.json();
    return Response.json({ status: res.status, data });
  }

  return Response.json({ error: "unknown provider" }, { status: 400 });
}

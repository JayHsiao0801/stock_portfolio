import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    claude: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

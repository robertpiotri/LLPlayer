import type { NextRequest } from "next/server";
import { translateLines, TranslateError } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { texts?: unknown; target?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const texts = body.texts;
  if (!Array.isArray(texts) || !texts.every((t) => typeof t === "string")) {
    return Response.json({ error: "Pole 'texts' musi być listą tekstów." }, { status: 400 });
  }
  const target = body.target || "pl";
  const source = body.source || "en";

  try {
    const translations = await translateLines(texts as string[], target, source);
    return Response.json({ translations });
  } catch (e) {
    if (e instanceof TranslateError && e.code === "NO_KEY") {
      return Response.json(
        { error: "Brak klucza OpenAI — ustaw OPENAI_API_KEY w web/.env.local." },
        { status: 503 },
      );
    }
    return Response.json({ error: "Tłumaczenie nie powiodło się." }, { status: 502 });
  }
}

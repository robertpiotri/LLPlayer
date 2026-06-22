import type { NextRequest } from "next/server";
import { getStreamable } from "@/lib/ytdlp";
import { parseVtt } from "@/lib/vtt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pobiera napisy danego jezyka (vtt) ze zrodla, parsuje do cue'ow i zwraca jako JSON.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("v");
  const lang = params.get("lang");
  const auto = params.get("auto") === "1";
  if (!id || !lang) {
    return Response.json({ error: "Brak parametrów v/lang." }, { status: 400 });
  }

  let resolved;
  try {
    resolved = await getStreamable(id);
  } catch {
    return Response.json({ error: "Nie udało się wczytać filmu." }, { status: 502 });
  }

  const track = resolved.subs.find((s) => s.lang === lang && s.auto === auto);
  if (!track) {
    return Response.json({ error: "Nie znaleziono napisów w tym języku." }, { status: 404 });
  }

  try {
    const res = await fetch(track.vttUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const cues = parseVtt(await res.text());
    return Response.json({ lang: track.lang, auto: track.auto, cues });
  } catch {
    return Response.json({ error: "Nie udało się pobrać napisów." }, { status: 502 });
  }
}

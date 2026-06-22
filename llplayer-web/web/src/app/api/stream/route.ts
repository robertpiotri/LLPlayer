import type { NextRequest } from "next/server";
import { getStreamable } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy strumienia: klient -> nasz serwer -> YouTube.
// Nie podajemy URL-a YouTube wprost do <video> (CORS + wygasanie + naglowki).
// Przekazujemy naglowek Range, zeby dzialalo przewijanie (seek).
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("v");
  if (!id) return new Response("Brak parametru v.", { status: 400 });

  let resolved;
  try {
    resolved = await getStreamable(id);
  } catch {
    return new Response("Nie udało się przygotować strumienia.", { status: 502 });
  }

  const range = request.headers.get("range");
  const upstreamHeaders: Record<string, string> = { ...resolved.httpHeaders };
  if (range) upstreamHeaders["Range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(resolved.streamUrl, { headers: upstreamHeaders });
  } catch {
    return new Response("Źródło chwilowo niedostępne.", { status: 502 });
  }

  // Przepisujemy tylko naglowki istotne dla odtwarzania/seeku.
  const headers = new Headers();
  for (const h of ["content-range", "content-length", "accept-ranges", "content-type"]) {
    const val = upstream.headers.get(h);
    if (val) headers.set(h, val);
  }
  if (!headers.has("content-type")) headers.set("content-type", resolved.mime);
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "no-store");

  return new Response(upstream.body, { status: upstream.status, headers });
}

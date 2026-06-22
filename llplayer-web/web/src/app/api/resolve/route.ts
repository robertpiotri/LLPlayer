import type { NextRequest } from "next/server";
import { resolveVideo, isYouTubeUrl, ResolveError } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: "Podaj link do filmu." }, { status: 400 });
  }
  if (!isYouTubeUrl(url)) {
    return Response.json(
      { error: "Na razie obsługiwany jest wyłącznie YouTube." },
      { status: 400 },
    );
  }

  try {
    const v = await resolveVideo(url);
    return Response.json({
      id: v.id,
      title: v.title,
      duration: v.duration,
      width: v.width,
      height: v.height,
    });
  } catch (e) {
    if (e instanceof ResolveError && e.code === "PROGRESSIVE_UNAVAILABLE") {
      return Response.json(
        {
          error:
            "Ten film wymaga łączenia ścieżek audio/wideo — wsparcie w kolejnej fazie.",
        },
        { status: 422 },
      );
    }
    return Response.json(
      { error: "Nie udało się wczytać tego linku. Sprawdź adres lub spróbuj inny." },
      { status: 502 },
    );
  }
}

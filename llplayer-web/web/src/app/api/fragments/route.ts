import type { NextRequest } from "next/server";
import { listFragments, addFragment, deleteFragment } from "@/lib/store";
import type { NewFragment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const fragments = await listFragments();
  return Response.json({ fragments });
}

export async function POST(request: NextRequest) {
  let body: Partial<NewFragment>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const en = (body.en ?? "").trim();
  const pl = (body.pl ?? "").trim();
  if (!en || !pl) {
    return Response.json(
      { error: "Fragment musi mieć tekst EN i PL." },
      { status: 400 },
    );
  }

  const fragment = await addFragment({
    videoId: body.videoId ?? "",
    videoTitle: body.videoTitle ?? "",
    videoUrl: body.videoUrl ?? "",
    timeStart: typeof body.timeStart === "number" ? body.timeStart : 0,
    timeEnd: typeof body.timeEnd === "number" ? body.timeEnd : 0,
    en,
    pl,
    contextEn: Array.isArray(body.contextEn) ? body.contextEn : [],
    contextPl: Array.isArray(body.contextPl) ? body.contextPl : [],
  });
  return Response.json({ fragment });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Brak id." }, { status: 400 });
  const ok = await deleteFragment(id);
  if (!ok) return Response.json({ error: "Nie znaleziono fragmentu." }, { status: 404 });
  return Response.json({ ok: true });
}

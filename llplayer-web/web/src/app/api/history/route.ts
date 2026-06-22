import type { NextRequest } from "next/server";
import { listHistory, upsertHistory, deleteHistory } from "@/lib/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const history = await listHistory();
  return Response.json({ history });
}

export async function POST(request: NextRequest) {
  let body: { videoId?: string; title?: string; url?: string; positionSec?: number; durationSec?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }
  if (!body.videoId) {
    return Response.json({ error: "Brak videoId." }, { status: 400 });
  }
  const entry = await upsertHistory({
    videoId: body.videoId,
    title: body.title,
    url: body.url,
    positionSec: body.positionSec,
    durationSec: body.durationSec,
  });
  return Response.json({ entry });
}

export async function DELETE(request: NextRequest) {
  const v = request.nextUrl.searchParams.get("v");
  if (!v) return Response.json({ error: "Brak v." }, { status: 400 });
  const ok = await deleteHistory(v);
  if (!ok) return Response.json({ error: "Nie znaleziono." }, { status: 404 });
  return Response.json({ ok: true });
}

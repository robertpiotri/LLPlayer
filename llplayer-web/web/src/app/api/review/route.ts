import type { NextRequest } from "next/server";
import { reviewFragment } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ocena fiszki w trybie nauki: { id, known: boolean }.
export async function POST(request: NextRequest) {
  let body: { id?: string; known?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }
  if (!body.id || typeof body.known !== "boolean") {
    return Response.json({ error: "Wymagane pola: id, known." }, { status: 400 });
  }
  const fragment = await reviewFragment(body.id, body.known);
  if (!fragment) {
    return Response.json({ error: "Nie znaleziono fragmentu." }, { status: 404 });
  }
  return Response.json({ fragment });
}

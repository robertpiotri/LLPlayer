import type { NextRequest } from "next/server";
import { getPrefs, savePrefs, type Prefs } from "@/lib/prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const prefs = await getPrefs();
  return Response.json({ prefs });
}

export async function POST(request: NextRequest) {
  let body: Partial<Prefs>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }
  const prefs = await savePrefs(body);
  return Response.json({ prefs });
}

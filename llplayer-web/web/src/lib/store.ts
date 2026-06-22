import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Fragment, NewFragment } from "./types";

// Prosty, trwaly magazyn kolekcji fragmentow w pliku JSON.
// Self-hosted, jeden uzytkownik -> plik w zupelnosci wystarcza i latwo go backupowac.
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "fragments.json");

// Interwaly powtorek (Leitner). Indeks = box. Nieumiana wraca w tej samej sesji.
const INTERVALS_MS = [
  1 * 60 * 1000, // box 0 -> 1 min
  60 * 60 * 1000, // box 1 -> 1 h
  24 * 60 * 60 * 1000, // box 2 -> 1 dzien
  3 * 24 * 60 * 60 * 1000, // box 3 -> 3 dni
  7 * 24 * 60 * 60 * 1000, // box 4 -> 7 dni
  21 * 24 * 60 * 60 * 1000, // box 5 -> 21 dni
];
const MAX_BOX = INTERVALS_MS.length - 1;

let cache: Fragment[] | null = null;

// Uzupelnia brakujace pola (np. dla fragmentow zapisanych przed dodaniem SRS).
function normalize(f: Partial<Fragment>): Fragment {
  return {
    id: String(f.id ?? randomUUID()),
    createdAt: typeof f.createdAt === "number" ? f.createdAt : 0,
    videoId: f.videoId ?? "",
    videoTitle: f.videoTitle ?? "",
    videoUrl: f.videoUrl ?? "",
    timeStart: f.timeStart ?? 0,
    timeEnd: f.timeEnd ?? 0,
    en: f.en ?? "",
    pl: f.pl ?? "",
    contextEn: Array.isArray(f.contextEn) ? f.contextEn : [],
    contextPl: Array.isArray(f.contextPl) ? f.contextPl : [],
    box: typeof f.box === "number" ? f.box : 0,
    due: typeof f.due === "number" ? f.due : 0,
    lastReviewed: typeof f.lastReviewed === "number" ? f.lastReviewed : null,
  };
}

async function loadAll(): Promise<Fragment[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    cache = Array.isArray(parsed) ? parsed.map((x) => normalize(x as Partial<Fragment>)) : [];
  } catch {
    cache = []; // brak pliku = pusta kolekcja
  }
  return cache;
}

async function persist(items: Fragment[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  // Zapis atomowy: tmp -> rename, zeby nie uszkodzic pliku przy przerwaniu.
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, FILE);
}

export async function listFragments(): Promise<Fragment[]> {
  const all = await loadAll();
  return [...all].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addFragment(data: NewFragment): Promise<Fragment> {
  const all = await loadAll();
  const now = Date.now();
  const frag: Fragment = {
    ...data,
    id: randomUUID(),
    createdAt: now,
    box: 0,
    due: now, // do powtorki od razu
    lastReviewed: null,
  };
  all.push(frag);
  await persist(all);
  return frag;
}

export async function deleteFragment(id: string): Promise<boolean> {
  const all = await loadAll();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  await persist(all);
  return true;
}

// Ocena fiszki: umiem -> wyzszy box i pozniejszy termin; nie umiem -> reset.
export async function reviewFragment(id: string, known: boolean): Promise<Fragment | null> {
  const all = await loadAll();
  const f = all.find((x) => x.id === id);
  if (!f) return null;
  f.box = known ? Math.min(f.box + 1, MAX_BOX) : 0;
  f.due = Date.now() + INTERVALS_MS[f.box];
  f.lastReviewed = Date.now();
  await persist(all);
  return f;
}

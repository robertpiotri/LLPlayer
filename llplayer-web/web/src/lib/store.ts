import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Fragment, NewFragment } from "./types";

// Prosty, trwaly magazyn kolekcji fragmentow w pliku JSON.
// Self-hosted, jeden uzytkownik -> plik w zupelnosci wystarcza i latwo go backupowac.
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "fragments.json");

let cache: Fragment[] | null = null;

async function loadAll(): Promise<Fragment[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? parsed : [];
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
  const frag: Fragment = { ...data, id: randomUUID(), createdAt: Date.now() };
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

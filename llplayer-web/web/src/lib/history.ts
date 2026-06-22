import { readJson, writeJson } from "./jsonfile";

export type HistoryEntry = {
  videoId: string;
  title: string;
  url: string;
  positionSec: number;
  durationSec: number;
  lastWatched: number;
};

const FILE = "history.json";

export async function listHistory(): Promise<HistoryEntry[]> {
  const all = await readJson<HistoryEntry[]>(FILE, []);
  return all.sort((a, b) => b.lastWatched - a.lastWatched);
}

export type HistoryPatch = {
  videoId: string;
  title?: string;
  url?: string;
  positionSec?: number;
  durationSec?: number;
};

export async function upsertHistory(p: HistoryPatch): Promise<HistoryEntry> {
  const all = await readJson<HistoryEntry[]>(FILE, []);
  let entry = all.find((h) => h.videoId === p.videoId);
  if (!entry) {
    entry = {
      videoId: p.videoId,
      title: p.title ?? "",
      url: p.url ?? "",
      positionSec: 0,
      durationSec: 0,
      lastWatched: Date.now(),
    };
    all.push(entry);
  }
  if (p.title) entry.title = p.title;
  if (p.url) entry.url = p.url;
  if (typeof p.positionSec === "number") entry.positionSec = p.positionSec;
  if (typeof p.durationSec === "number" && p.durationSec) entry.durationSec = p.durationSec;
  entry.lastWatched = Date.now();
  await writeJson(FILE, all);
  return entry;
}

export async function deleteHistory(videoId: string): Promise<boolean> {
  const all = await readJson<HistoryEntry[]>(FILE, []);
  const idx = all.findIndex((h) => h.videoId === videoId);
  if (idx === -1) return false;
  all.splice(idx, 1);
  await writeJson(FILE, all);
  return true;
}

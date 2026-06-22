import { readJson, writeJson } from "./jsonfile";

export type Prefs = {
  sourceLang: string | null; // domyslny jezyk napisow zrodlowych
  target: string | null; // domyslny jezyk tlumaczenia
  subFontScale: number; // skala rozmiaru napisow
};

const FILE = "prefs.json";

export const DEFAULT_PREFS: Prefs = {
  sourceLang: null,
  target: "pl",
  subFontScale: 1,
};

export async function getPrefs(): Promise<Prefs> {
  const p = await readJson<Partial<Prefs>>(FILE, {});
  return { ...DEFAULT_PREFS, ...p };
}

export async function savePrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const next = { ...(await getPrefs()), ...patch };
  await writeJson(FILE, next);
  return next;
}

// Minimalny parser WebVTT -> lista cue'ow {start, end, text} w sekundach.
// Radzi sobie z napisami recznymi (czyste) i auto-napisami YouTube
// (tagi inline <...>, powtarzajace sie linie).

export type Cue = { start: number; end: number; text: string };

function parseTimestamp(s: string): number {
  // "HH:MM:SS.mmm" lub "MM:SS.mmm"
  const m = s.match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
  if (!m) return NaN;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const ms = parseInt(m[4].padEnd(3, "0"), 10);
  return h * 3600 + min * 60 + sec + ms / 1000;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(lines: string[]): string {
  return decodeEntities(
    lines
      .join(" ")
      .replace(/<[^>]*>/g, "") // tagi inline (np. <00:00:01.000><c>)
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function parseVtt(input: string): Cue[] {
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = text.split(/\n\n+/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const arrowIdx = lines.findIndex((l) => l.includes("-->"));
    if (arrowIdx === -1) continue; // naglowek WEBVTT / NOTE / STYLE

    const [startRaw, restRaw] = lines[arrowIdx].split("-->");
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(restRaw); // ustawienia po czasie sa ignorowane
    if (Number.isNaN(start) || Number.isNaN(end)) continue;

    const body = cleanText(lines.slice(arrowIdx + 1));
    if (!body) continue;

    // Scal powtarzajace sie kolejne linie (rolling auto-napisy).
    const prev = cues[cues.length - 1];
    if (prev && prev.text === body) {
      prev.end = Math.max(prev.end, end);
    } else {
      cues.push({ start, end, text: body });
    }
  }

  return cues;
}

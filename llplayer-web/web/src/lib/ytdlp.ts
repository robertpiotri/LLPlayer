import { spawn } from "node:child_process";

// Sciezka do binarki yt-dlp. W dev ustawiona w .env.local na ~/.local/bin/yt-dlp.
const YTDLP_BIN = process.env.YTDLP_BIN || "yt-dlp";

export type ResolvedVideo = {
  id: string;
  title: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  // Pola tylko-serwerowe (nie wysylamy ich do klienta):
  streamUrl: string;
  httpHeaders: Record<string, string>;
  mime: string;
};

type CacheEntry = { value: ResolvedVideo; expires: number };

// Prosty cache w pamieci procesu. Self-hosted, jeden uzytkownik -> wystarczy.
// URL-e formatow z YouTube wygasaja, wiec trzymamy je krotko.
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 60 * 1000; // ~5h

type YtFormat = {
  url?: string;
  ext?: string;
  acodec?: string;
  vcodec?: string;
  height?: number | null;
  width?: number | null;
  protocol?: string;
  http_headers?: Record<string, string>;
};

function runYtDlp(args: string[], timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("yt-dlp timeout"));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(err.trim() || `yt-dlp zakonczyl sie kodem ${code}`));
    });
  });
}

// Wybiera najlepszy format "progresywny" (audio+wideo w jednym strumieniu),
// ktory da sie odtworzyc bezposrednio w <video>. Na YouTube to zwykle 360p mp4.
// Wyzsze rozdzielczosci to DASH (osobne sciezki) -> laczenie ffmpeg w kolejnej fazie.
function pickProgressive(formats: YtFormat[]): YtFormat | null {
  const progressive = formats.filter(
    (f) =>
      !!f.url &&
      !!f.acodec &&
      f.acodec !== "none" &&
      !!f.vcodec &&
      f.vcodec !== "none" &&
      (f.protocol === "https" || f.protocol === "http"),
  );
  if (progressive.length === 0) return null;
  progressive.sort((a, b) => {
    const mp4 = (f: YtFormat) => (f.ext === "mp4" ? 1 : 0);
    if (mp4(b) !== mp4(a)) return mp4(b) - mp4(a);
    return (b.height || 0) - (a.height || 0);
  });
  return progressive[0];
}

export class ResolveError extends Error {
  constructor(public code: "PROGRESSIVE_UNAVAILABLE" | "YTDLP_FAILED") {
    super(code);
  }
}

export async function resolveVideo(input: string): Promise<ResolvedVideo> {
  let raw: string;
  try {
    raw = await runYtDlp(["-J", "--no-warnings", "--no-playlist", input]);
  } catch {
    throw new ResolveError("YTDLP_FAILED");
  }

  const info = JSON.parse(raw);
  const fmt = pickProgressive(info.formats || []);
  if (!fmt || !fmt.url) throw new ResolveError("PROGRESSIVE_UNAVAILABLE");

  const value: ResolvedVideo = {
    id: String(info.id),
    title: info.title ?? String(info.id),
    duration: typeof info.duration === "number" ? info.duration : null,
    width: fmt.width ?? null,
    height: fmt.height ?? null,
    streamUrl: fmt.url,
    httpHeaders: fmt.http_headers ?? {},
    mime: fmt.ext === "webm" ? "video/webm" : "video/mp4",
  };
  cache.set(value.id, { value, expires: Date.now() + TTL_MS });
  return value;
}

// Zwraca dane do streamowania dla danego id. Jesli cache wygasl, re-resolve.
export async function getStreamable(id: string): Promise<ResolvedVideo> {
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return hit.value;
  return resolveVideo(`https://www.youtube.com/watch?v=${id}`);
}

export function isYouTubeUrl(input: string): boolean {
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
}

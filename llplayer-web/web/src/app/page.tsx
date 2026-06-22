"use client";

import { useRef, useState } from "react";

type SubMeta = { lang: string; name: string; auto: boolean };

type ResolveResult = {
  id: string;
  title: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  subs: SubMeta[];
  defaultSub: { lang: string; auto: boolean } | null;
};

type Cue = { start: number; end: number; text: string };

function formatDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const subKey = (lang: string, auto: boolean) => `${auto ? "a" : "m"}:${lang}`;

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<ResolveResult | null>(null);

  // Napisy
  const [selected, setSelected] = useState<{ lang: string; auto: boolean } | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const cueAbort = useRef<AbortController | null>(null);

  // Pobiera cue'y dla wybranej sciezki napisow (wywolywane ze zdarzen, nie z efektu).
  async function loadCues(videoId: string, sel: { lang: string; auto: boolean }) {
    cueAbort.current?.abort();
    const controller = new AbortController();
    cueAbort.current = controller;
    setSelected(sel);
    setSubsLoading(true);
    try {
      const res = await fetch(
        `/api/subs?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(
          sel.lang,
        )}&auto=${sel.auto ? "1" : "0"}`,
        { signal: controller.signal },
      );
      const data = await res.json();
      setCues(Array.isArray(data.cues) ? data.cues : []);
    } catch {
      /* abort lub blad — zostaw puste */
    } finally {
      setSubsLoading(false);
    }
  }

  function clearSubs() {
    cueAbort.current?.abort();
    setSelected(null);
    setCues([]);
  }

  async function load(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVideo(null);
    clearSubs();
    setLoading(true);
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się wczytać filmu.");
        return;
      }
      const result = data as ResolveResult;
      setVideo(result);
      if (result.defaultSub) void loadCues(result.id, result.defaultSub);
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }

  const activeCue = cues.find((c) => currentTime >= c.start && currentTime < c.end);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 text-zinc-100">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">LLPlayer Web</h1>
        <p className="text-sm text-zinc-400">
          Wklej link do filmu z YouTube, aby go odtworzyć z napisami.
        </p>
      </header>

      <form onSubmit={load} className="flex gap-2">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
        >
          {loading ? "Wczytywanie…" : "Załaduj"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {video && (
        <section className="flex flex-col gap-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video
              key={video.id}
              src={`/api/stream?v=${encodeURIComponent(video.id)}`}
              controls
              autoPlay
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              className="h-full w-full"
            />
            {/* Wlasna warstwa napisow nad wideo (nie blokuje kontrolek). */}
            {activeCue && (
              <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-4">
                <span className="max-w-3xl rounded bg-black/70 px-3 py-1 text-center text-lg leading-snug text-white">
                  {activeCue.text}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{video.title}</h2>
            <span className="text-sm text-zinc-400">
              {formatDuration(video.duration)}
              {video.height ? ` · ${video.height}p` : ""}
            </span>
          </div>

          {/* Wybor napisow */}
          {video.subs.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              Napisy:
              <select
                value={selected ? subKey(selected.lang, selected.auto) : "off"}
                onChange={(e) => {
                  if (e.target.value === "off") {
                    clearSubs();
                    return;
                  }
                  const found = video.subs.find(
                    (s) => subKey(s.lang, s.auto) === e.target.value,
                  );
                  if (found) void loadCues(video.id, { lang: found.lang, auto: found.auto });
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 outline-none"
              >
                <option value="off">Wyłączone</option>
                {video.subs.map((s) => (
                  <option key={subKey(s.lang, s.auto)} value={subKey(s.lang, s.auto)}>
                    {s.name} ({s.lang}){s.auto ? " — auto" : ""}
                  </option>
                ))}
              </select>
              {subsLoading && <span className="text-zinc-500">wczytywanie…</span>}
            </label>
          ) : (
            <p className="text-sm text-zinc-500">Ten film nie ma napisów.</p>
          )}
        </section>
      )}
    </main>
  );
}

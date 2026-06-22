"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Fragment } from "@/lib/types";
import type { HistoryEntry } from "@/lib/history";
import type { Prefs } from "@/lib/prefs";

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

const DEFAULT_PREFS: Prefs = { sourceLang: null, target: "pl", subFontScale: 1 };

function formatDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const TARGETS: { code: string; label: string }[] = [
  { code: "pl", label: "Polski" },
  { code: "de", label: "Niemiecki" },
  { code: "es", label: "Hiszpański" },
];

const FONT_SCALES: { value: number; label: string }[] = [
  { value: 0.85, label: "S" },
  { value: 1, label: "M" },
  { value: 1.15, label: "L" },
  { value: 1.3, label: "XL" },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<ResolveResult | null>(null);

  const [primary, setPrimary] = useState<{ lang: string; auto: boolean } | null>(null);
  const [primaryCues, setPrimaryCues] = useState<Cue[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [target, setTarget] = useState<string | null>("pl");
  const [secondaryCues, setSecondaryCues] = useState<Cue[]>([]);
  const [translating, setTranslating] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [capture, setCapture] = useState<{ en: string; pl: string; start: number; end: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Faza 6: historia + preferencje
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cueAbort = useRef<AbortController | null>(null);
  const transAbort = useRef<AbortController | null>(null);
  const resumeRef = useRef<number>(0); // pozycja do wznowienia po zaladowaniu metadanych
  const lastSaveRef = useRef<number>(0); // throttle zapisu pozycji

  // Wczytaj kolekcje, historie i preferencje na starcie.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [fr, hi, pr] = await Promise.all([
          fetch("/api/fragments").then((r) => r.json()),
          fetch("/api/history").then((r) => r.json()),
          fetch("/api/prefs").then((r) => r.json()),
        ]);
        if (!active) return;
        if (Array.isArray(fr.fragments)) setFragments(fr.fragments);
        if (Array.isArray(hi.history)) setHistory(hi.history);
        if (pr?.prefs) {
          setPrefs(pr.prefs);
          if (typeof pr.prefs.target !== "undefined") setTarget(pr.prefs.target);
        }
      } catch {
        /* offline na starcie — zostaja domyslne */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function translate(cues: Cue[], tgt: string, sourceLang: string) {
    transAbort.current?.abort();
    const controller = new AbortController();
    transAbort.current = controller;
    setTransError(null);
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: cues.map((c) => c.text), target: tgt, source: sourceLang.split("-")[0] }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setSecondaryCues([]);
        setTransError(data.error ?? "Tłumaczenie nie powiodło się.");
        return;
      }
      const tr: string[] = data.translations ?? [];
      setSecondaryCues(cues.map((c, i) => ({ ...c, text: tr[i] ?? "" })));
    } catch {
      /* abort */
    } finally {
      setTranslating(false);
    }
  }

  async function loadPrimary(videoId: string, sel: { lang: string; auto: boolean }) {
    cueAbort.current?.abort();
    const controller = new AbortController();
    cueAbort.current = controller;
    setPrimary(sel);
    setSecondaryCues([]);
    setSubsLoading(true);
    try {
      const res = await fetch(
        `/api/subs?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(sel.lang)}&auto=${sel.auto ? "1" : "0"}`,
        { signal: controller.signal },
      );
      const data = await res.json();
      const cues: Cue[] = Array.isArray(data.cues) ? data.cues : [];
      setPrimaryCues(cues);
      if (target && cues.length > 0) void translate(cues, target, sel.lang);
    } catch {
      /* abort */
    } finally {
      setSubsLoading(false);
    }
  }

  function changeTarget(tgt: string | null) {
    setTarget(tgt);
    transAbort.current?.abort();
    if (tgt && primary && primaryCues.length > 0) void translate(primaryCues, tgt, primary.lang);
    else {
      setSecondaryCues([]);
      setTransError(null);
    }
  }

  async function recordHistory(
    videoId: string,
    title: string,
    histUrl: string,
    positionSec?: number,
    durationSec?: number,
  ) {
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, title, url: histUrl, positionSec, durationSec }),
      });
      const d = await res.json();
      if (d.entry) setHistory((prev) => [d.entry, ...prev.filter((h) => h.videoId !== videoId)]);
    } catch {
      /* offline */
    }
  }

  function saveProgress() {
    if (!video || !videoRef.current) return;
    recordHistory(
      video.id,
      video.title,
      `https://www.youtube.com/watch?v=${video.id}`,
      videoRef.current.currentTime,
      video.duration ?? undefined,
    );
  }

  async function removeHistory(videoId: string) {
    const res = await fetch(`/api/history?v=${encodeURIComponent(videoId)}`, { method: "DELETE" });
    if (res.ok) setHistory((prev) => prev.filter((h) => h.videoId !== videoId));
  }

  async function updatePrefs(patch: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
    try {
      await fetch("/api/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      /* offline */
    }
  }

  async function resolveUrl(targetUrl: string) {
    setError(null);
    setVideo(null);
    setPrimary(null);
    setPrimaryCues([]);
    setSecondaryCues([]);
    setTransError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się wczytać filmu.");
        return;
      }
      const result = data as ResolveResult;
      setVideo(result);

      // Wznawianie: pozycja z historii.
      const hist = history.find((h) => h.videoId === result.id);
      resumeRef.current = hist?.positionSec ?? 0;
      void recordHistory(
        result.id,
        result.title,
        `https://www.youtube.com/watch?v=${result.id}`,
        undefined,
        result.duration ?? undefined,
      );

      // Wybor zrodla: preferowany jezyk, jesli dostepny, inaczej domyslny EN.
      const manuals = result.subs.filter((s) => !s.auto);
      const prefSource =
        prefs.sourceLang && manuals.find((s) => s.lang === prefs.sourceLang)
          ? { lang: prefs.sourceLang, auto: false }
          : result.defaultSub;
      if (prefSource) void loadPrimary(result.id, prefSource);
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }

  function load(e: React.FormEvent) {
    e.preventDefault();
    void resolveUrl(url);
  }

  function openHistory(h: HistoryEntry) {
    setUrl(h.url);
    void resolveUrl(h.url);
  }

  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    setCurrentTime(e.currentTarget.currentTime);
    // e.timeStamp (monotoniczny, czysty odczyt) zamiast Date.now() — throttle co 5s.
    const now = e.timeStamp;
    if (now - lastSaveRef.current > 5000) {
      lastSaveRef.current = now;
      saveProgress();
    }
  }

  function openCapture() {
    videoRef.current?.pause();
    const t = videoRef.current?.currentTime ?? currentTime;
    const enCue = cueAt(primaryCues, t);
    const plCue = cueAt(secondaryCues, t);
    setCapture({ en: enCue?.text ?? "", pl: plCue?.text ?? "", start: enCue?.start ?? t, end: enCue?.end ?? t });
  }

  async function saveFragment() {
    if (!video || !capture) return;
    setSaving(true);
    const idx = primaryCues.findIndex((c) => c.start === capture.start);
    const around = (arr: Cue[]) => (idx >= 0 ? arr.slice(Math.max(0, idx - 1), idx + 2).map((c) => c.text) : []);
    try {
      const res = await fetch("/api/fragments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          videoTitle: video.title,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
          timeStart: capture.start,
          timeEnd: capture.end,
          en: capture.en,
          pl: capture.pl,
          contextEn: around(primaryCues),
          contextPl: around(secondaryCues),
        }),
      });
      const data = await res.json();
      if (res.ok && data.fragment) {
        setFragments((prev) => [data.fragment, ...prev]);
        setCapture(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeFragment(id: string) {
    const res = await fetch(`/api/fragments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setFragments((prev) => prev.filter((f) => f.id !== id));
  }

  function jumpTo(frag: Fragment) {
    if (video && frag.videoId === video.id && videoRef.current) {
      videoRef.current.currentTime = frag.timeStart;
      void videoRef.current.play();
    }
  }

  const manualSubs = video?.subs.filter((s) => !s.auto) ?? [];
  const activePrimary = primaryCues.find((c) => currentTime >= c.start && currentTime < c.end);
  const activeSecondary = secondaryCues.find((c) => currentTime >= c.start && currentTime < c.end);
  const subStyle = { fontSize: `${1.125 * prefs.subFontScale}rem` };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 text-zinc-100">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LLPlayer Web</h1>
          <p className="text-sm text-zinc-400">
            Wklej link z YouTube — napisy EN+PL i zapisywanie fragmentów do nauki.
          </p>
        </div>
        <Link
          href="/study"
          className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Nauka (fiszki) →
        </Link>
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
        <div className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Ostatnio ogladane */}
      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-400">Ostatnio oglądane</h2>
          <ul className="flex flex-col gap-1">
            {history.slice(0, 6).map((h) => (
              <li key={h.videoId} className="flex items-center justify-between gap-2 text-sm">
                <button onClick={() => openHistory(h)} className="truncate text-left text-zinc-200 hover:text-white">
                  {h.title || h.url}
                  {h.positionSec > 5 && (
                    <span className="ml-2 text-xs text-zinc-500">wznów {formatDuration(h.positionSec)}</span>
                  )}
                </button>
                <button onClick={() => removeHistory(h.videoId)} className="shrink-0 text-xs text-zinc-600 hover:text-red-400">
                  usuń
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {video && (
        <section className="flex flex-col gap-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              key={video.id}
              src={`/api/stream?v=${encodeURIComponent(video.id)}`}
              controls
              autoPlay
              onLoadedMetadata={(e) => {
                if (resumeRef.current > 1) {
                  e.currentTarget.currentTime = resumeRef.current;
                  resumeRef.current = 0;
                }
              }}
              onTimeUpdate={onTimeUpdate}
              onPause={saveProgress}
              className="h-full w-full"
            />
            {(activeSecondary || activePrimary) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-16 flex flex-col items-center gap-1 px-4">
                {activeSecondary?.text && (
                  <span style={subStyle} className="max-w-3xl rounded bg-black/70 px-3 py-1 text-center leading-snug text-amber-200">
                    {activeSecondary.text}
                  </span>
                )}
                {activePrimary?.text && (
                  <span style={subStyle} className="max-w-3xl rounded bg-black/70 px-3 py-1 text-center leading-snug text-white">
                    {activePrimary.text}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{video.title}</h2>
            <button
              onClick={openCapture}
              disabled={primaryCues.length === 0}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-40"
            >
              ＋ Zapisz fragment
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-400">
            {manualSubs.length > 0 ? (
              <label className="flex items-center gap-2">
                Napisy (źródło):
                <select
                  value={primary ? primary.lang : "off"}
                  onChange={(e) => {
                    if (e.target.value === "off") {
                      cueAbort.current?.abort();
                      setPrimary(null);
                      setPrimaryCues([]);
                      setSecondaryCues([]);
                      return;
                    }
                    void updatePrefs({ sourceLang: e.target.value });
                    void loadPrimary(video.id, { lang: e.target.value, auto: false });
                  }}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 outline-none"
                >
                  <option value="off">Wyłączone</option>
                  {manualSubs.map((s) => (
                    <option key={s.lang} value={s.lang}>
                      {s.name} ({s.lang})
                    </option>
                  ))}
                </select>
                {subsLoading && <span className="text-zinc-500">wczytywanie…</span>}
              </label>
            ) : (
              <span className="text-zinc-500">
                Ten film nie ma gotowych napisów (auto pomijamy). Pobieranie z zewnętrznego źródła — w przygotowaniu.
              </span>
            )}

            <label className="flex items-center gap-2">
              Tłumaczenie:
              <select
                value={target ?? "off"}
                onChange={(e) => {
                  const val = e.target.value === "off" ? null : e.target.value;
                  changeTarget(val);
                  void updatePrefs({ target: val });
                }}
                disabled={!primary}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 outline-none disabled:opacity-50"
              >
                <option value="off">Wyłączone</option>
                {TARGETS.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
              {translating && <span className="text-zinc-500">tłumaczenie…</span>}
            </label>

            <label className="flex items-center gap-2">
              Rozmiar napisów:
              <select
                value={prefs.subFontScale}
                onChange={(e) => void updatePrefs({ subFontScale: Number(e.target.value) })}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 outline-none"
              >
                {FONT_SCALES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {transError && <p className="text-sm text-amber-400">{transError}</p>}

          {capture && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-700/50 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-300">Zapisz fragment ({formatDuration(capture.start)})</span>
                <span className="text-xs text-zinc-500">Przytnij oba pola do żądanego fragmentu</span>
              </div>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Angielski
                <textarea
                  value={capture.en}
                  onChange={(e) => setCapture({ ...capture, en: e.target.value })}
                  rows={2}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Polski
                <textarea
                  value={capture.pl}
                  onChange={(e) => setCapture({ ...capture, pl: e.target.value })}
                  rows={2}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-amber-100 outline-none focus:border-zinc-500"
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={saveFragment}
                  disabled={saving || !capture.en.trim() || !capture.pl.trim()}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40"
                >
                  {saving ? "Zapisywanie…" : "Zapisz parę"}
                </button>
                <button
                  onClick={() => setCapture(null)}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Kolekcja ({fragments.length})</h2>
        {fragments.length === 0 ? (
          <p className="text-sm text-zinc-500">Brak zapisanych fragmentów. Zatrzymaj film i kliknij „Zapisz fragment”.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fragments.map((f) => (
              <li key={f.id} className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span className="truncate">
                    {f.videoTitle} · {formatDuration(f.timeStart)}
                  </span>
                  <span className="flex shrink-0 gap-3">
                    {video && f.videoId === video.id && (
                      <button onClick={() => jumpTo(f)} className="text-zinc-400 hover:text-zinc-100">
                        skok
                      </button>
                    )}
                    <button onClick={() => removeFragment(f.id)} className="text-red-400 hover:text-red-300">
                      usuń
                    </button>
                  </span>
                </div>
                <p className="text-sm text-amber-100">{f.pl}</p>
                <p className="text-sm text-zinc-200">{f.en}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// Cue aktywny w czasie t, a jesli brak — najblizszy wczesniejszy.
function cueAt(cues: Cue[], t: number): Cue | undefined {
  const active = cues.find((c) => t >= c.start && t < c.end);
  if (active) return active;
  let best: Cue | undefined;
  for (const c of cues) {
    if (c.start <= t) best = c;
    else break;
  }
  return best ?? cues[0];
}

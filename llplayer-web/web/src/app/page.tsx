"use client";

import { useEffect, useRef, useState } from "react";
import type { Fragment } from "@/lib/types";

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

const TARGETS: { code: string; label: string }[] = [
  { code: "pl", label: "Polski" },
  { code: "de", label: "Niemiecki" },
  { code: "es", label: "Hiszpański" },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<ResolveResult | null>(null);

  // Napisy zrodlowe (dol) + tlumaczenie (gora)
  const [primary, setPrimary] = useState<{ lang: string; auto: boolean } | null>(null);
  const [primaryCues, setPrimaryCues] = useState<Cue[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [target, setTarget] = useState<string | null>("pl");
  const [secondaryCues, setSecondaryCues] = useState<Cue[]>([]);
  const [translating, setTranslating] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Kolekcja fragmentow (Faza 4)
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [capture, setCapture] = useState<{
    en: string;
    pl: string;
    start: number;
    end: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cueAbort = useRef<AbortController | null>(null);
  const transAbort = useRef<AbortController | null>(null);

  // Wczytaj zapisana kolekcje na starcie (setState tylko w callbacku async).
  useEffect(() => {
    let active = true;
    fetch("/api/fragments")
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.fragments)) setFragments(d.fragments);
      })
      .catch(() => {});
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
        body: JSON.stringify({
          texts: cues.map((c) => c.text),
          target: tgt,
          source: sourceLang.split("-")[0],
        }),
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
      /* abort — ignoruj */
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
        `/api/subs?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(
          sel.lang,
        )}&auto=${sel.auto ? "1" : "0"}`,
        { signal: controller.signal },
      );
      const data = await res.json();
      const cues: Cue[] = Array.isArray(data.cues) ? data.cues : [];
      setPrimaryCues(cues);
      if (target && cues.length > 0) void translate(cues, target, sel.lang);
    } catch {
      /* abort — ignoruj */
    } finally {
      setSubsLoading(false);
    }
  }

  function changeTarget(tgt: string | null) {
    setTarget(tgt);
    transAbort.current?.abort();
    if (tgt && primary && primaryCues.length > 0) {
      void translate(primaryCues, tgt, primary.lang);
    } else {
      setSecondaryCues([]);
      setTransError(null);
    }
  }

  async function load(e: React.FormEvent) {
    e.preventDefault();
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
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się wczytać filmu.");
        return;
      }
      const result = data as ResolveResult;
      setVideo(result);
      if (result.defaultSub) void loadPrimary(result.id, result.defaultSub);
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }

  function openCapture() {
    videoRef.current?.pause();
    const t = videoRef.current?.currentTime ?? currentTime;
    const enCue = cueAt(primaryCues, t);
    const plCue = cueAt(secondaryCues, t);
    setCapture({
      en: enCue?.text ?? "",
      pl: plCue?.text ?? "",
      start: enCue?.start ?? t,
      end: enCue?.end ?? t,
    });
  }

  async function saveFragment() {
    if (!video || !capture) return;
    setSaving(true);
    // Kontekst: sasiednie linie wokol zaznaczonej kwestii (pod Faze 5).
    const idx = primaryCues.findIndex((c) => c.start === capture.start);
    const around = (arr: Cue[]) =>
      idx >= 0 ? arr.slice(Math.max(0, idx - 1), idx + 2).map((c) => c.text) : [];
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
    const res = await fetch(`/api/fragments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 text-zinc-100">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">LLPlayer Web</h1>
        <p className="text-sm text-zinc-400">
          Wklej link z YouTube — napisy EN+PL i zapisywanie fragmentów do nauki.
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
              ref={videoRef}
              key={video.id}
              src={`/api/stream?v=${encodeURIComponent(video.id)}`}
              controls
              autoPlay
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              className="h-full w-full"
            />
            {(activeSecondary || activePrimary) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-16 flex flex-col items-center gap-1 px-4">
                {activeSecondary?.text && (
                  <span className="max-w-3xl rounded bg-black/70 px-3 py-1 text-center text-lg leading-snug text-amber-200">
                    {activeSecondary.text}
                  </span>
                )}
                {activePrimary?.text && (
                  <span className="max-w-3xl rounded bg-black/70 px-3 py-1 text-center text-lg leading-snug text-white">
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
                Ten film nie ma gotowych napisów (auto pomijamy). Pobieranie z
                zewnętrznego źródła — w przygotowaniu.
              </span>
            )}

            <label className="flex items-center gap-2">
              Tłumaczenie:
              <select
                value={target ?? "off"}
                onChange={(e) =>
                  changeTarget(e.target.value === "off" ? null : e.target.value)
                }
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
          </div>

          {transError && <p className="text-sm text-amber-400">{transError}</p>}

          {/* Formularz przechwytywania pary (ręcznie EN + PL) */}
          {capture && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-700/50 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-300">
                  Zapisz fragment ({formatDuration(capture.start)})
                </span>
                <span className="text-xs text-zinc-500">
                  Przytnij oba pola do żądanego fragmentu
                </span>
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

      {/* Kolekcja fragmentow */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Kolekcja ({fragments.length})</h2>
        {fragments.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Brak zapisanych fragmentów. Zatrzymaj film i kliknij „Zapisz fragment”.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fragments.map((f) => (
              <li
                key={f.id}
                className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span className="truncate">
                    {f.videoTitle} · {formatDuration(f.timeStart)}
                  </span>
                  <span className="flex shrink-0 gap-3">
                    {video && f.videoId === video.id && (
                      <button
                        onClick={() => jumpTo(f)}
                        className="text-zinc-400 hover:text-zinc-100"
                      >
                        skok
                      </button>
                    )}
                    <button
                      onClick={() => removeFragment(f.id)}
                      className="text-red-400 hover:text-red-300"
                    >
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

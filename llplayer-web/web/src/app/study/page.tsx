"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Fragment } from "@/lib/types";

type Direction = "en-pl" | "pl-en";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Odtwarza fragment filmu w petli [start, end] jako kontekst fiszki.
function ClipPlayer({ videoId, start, end }: { videoId: string; start: number; end: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const effEnd = end > start ? end : start + 5;

  return (
    <video
      ref={ref}
      key={`${videoId}-${start}`}
      src={`/api/stream?v=${encodeURIComponent(videoId)}`}
      controls
      autoPlay
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = start;
        void e.currentTarget.play();
      }}
      onTimeUpdate={(e) => {
        if (e.currentTarget.currentTime >= effEnd) e.currentTarget.currentTime = start;
      }}
      className="aspect-video w-full rounded-md bg-black"
    />
  );
}

export default function Study() {
  const [loaded, setLoaded] = useState(false);
  const [all, setAll] = useState<Fragment[]>([]);
  const [queue, setQueue] = useState<Fragment[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [direction, setDirection] = useState<Direction>("en-pl");
  const [reviewedCount, setReviewedCount] = useState(0);

  // Wczytaj fragmenty i zbuduj kolejke do powtorki (due <= teraz).
  useEffect(() => {
    let active = true;
    fetch("/api/fragments")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const frags: Fragment[] = Array.isArray(d.fragments) ? d.fragments : [];
        setAll(frags);
        const now = Date.now();
        setQueue(frags.filter((f) => f.due <= now).sort((a, b) => a.due - b.due));
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const card = queue[index];

  async function answer(known: boolean) {
    if (!card) return;
    setReviewedCount((c) => c + 1);
    // Nieumiana wraca jeszcze w tej sesji (na koniec kolejki).
    if (!known) setQueue((q) => [...q, card]);
    setRevealed(false);
    setIndex((i) => i + 1);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, known }),
      });
    } catch {
      /* offline — stan lokalny i tak poszedl dalej */
    }
  }

  function studyAll() {
    setQueue(all.slice().sort((a, b) => a.due - b.due));
    setIndex(0);
    setRevealed(false);
    setReviewedCount(0);
  }

  const front = card ? (direction === "en-pl" ? card.en : card.pl) : "";
  const back = card ? (direction === "en-pl" ? card.pl : card.en) : "";
  const frontLang = direction === "en-pl" ? "EN" : "PL";
  const backLang = direction === "en-pl" ? "PL" : "EN";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 text-zinc-100">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nauka — fiszki</h1>
          <p className="text-sm text-zinc-400">Powtórki zapisanych fragmentów.</p>
        </div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Wróć do odtwarzacza
        </Link>
      </header>

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <label className="flex items-center gap-2">
          Kierunek:
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 outline-none"
          >
            <option value="en-pl">EN → PL</option>
            <option value="pl-en">PL → EN</option>
          </select>
        </label>
        {card && (
          <span>
            powtórzone: {reviewedCount} · w kolejce: {queue.length - index}
          </span>
        )}
      </div>

      {!loaded ? (
        <p className="text-sm text-zinc-500">Wczytywanie…</p>
      ) : !card ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          {all.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Brak fragmentów. Zapisz je w odtwarzaczu, a wrócą tu jako fiszki.
            </p>
          ) : (
            <>
              <p className="text-sm text-zinc-300">
                {reviewedCount > 0
                  ? `Powtórka zakończona — ${reviewedCount} fiszek. Nic więcej na teraz.`
                  : "Brak fiszek do powtórki na teraz."}
              </p>
              <button
                onClick={studyAll}
                className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
              >
                Ćwicz wszystkie ({all.length})
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Fiszka */}
          <div className="flex min-h-40 flex-col justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <span className="text-xs uppercase tracking-wide text-zinc-500">{frontLang}</span>
            <p className="text-xl">{front}</p>
            {revealed && (
              <>
                <hr className="border-zinc-800" />
                <span className="text-xs uppercase tracking-wide text-amber-500">{backLang}</span>
                <p className="text-xl text-amber-200">{back}</p>
              </>
            )}
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
            >
              Pokaż odpowiedź
            </button>
          ) : (
            <>
              {/* Kontekst: klip z momentu + sasiednie linie */}
              <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Kontekst · {card.videoTitle} · {formatDuration(card.timeStart)}
                </span>
                {card.videoId && (
                  <ClipPlayer videoId={card.videoId} start={card.timeStart} end={card.timeEnd} />
                )}
                {(card.contextEn.length > 0 || card.contextPl.length > 0) && (
                  <div className="flex flex-col gap-1 text-sm">
                    {card.contextEn.map((line, i) => (
                      <p key={`en-${i}`} className="text-zinc-300">
                        {line}
                      </p>
                    ))}
                    {card.contextPl.length > 0 && (
                      <div className="mt-1 border-t border-zinc-800 pt-1">
                        {card.contextPl.map((line, i) => (
                          <p key={`pl-${i}`} className="text-amber-100/80">
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => answer(false)}
                  className="flex-1 rounded-md bg-red-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                >
                  Nie umiem
                </button>
                <button
                  onClick={() => answer(true)}
                  className="flex-1 rounded-md bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                >
                  Umiem
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

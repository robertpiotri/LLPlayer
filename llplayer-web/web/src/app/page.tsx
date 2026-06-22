"use client";

import { useState } from "react";

type ResolveResult = {
  id: string;
  title: string;
  duration: number | null;
  width: number | null;
  height: number | null;
};

function formatDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<ResolveResult | null>(null);

  async function load(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVideo(null);
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
      setVideo(data as ResolveResult);
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 text-zinc-100">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">LLPlayer Web</h1>
        <p className="text-sm text-zinc-400">
          Wklej link do filmu z YouTube, aby go odtworzyć.
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
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video
              key={video.id}
              src={`/api/stream?v=${encodeURIComponent(video.id)}`}
              controls
              autoPlay
              className="h-full w-full"
            />
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-medium">{video.title}</h2>
            <span className="shrink-0 text-sm text-zinc-400">
              {formatDuration(video.duration)}
              {video.height ? ` · ${video.height}p` : ""}
            </span>
          </div>
        </section>
      )}
    </main>
  );
}

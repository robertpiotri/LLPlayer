# LLPlayer Web (roboczy)

Webowa, self-hostowana aplikacja do **nauki angielskiego z filmów na YouTube**.
Następca pomysłu z desktopowego LLPlayera, ale zbudowany od zera jako aplikacja
serwer + przeglądarka, bez zależności od Windows/DirectX.

> Nazwa robocza — można zmienić.

## Gdzie to żyje

Ten projekt znajduje się **wewnątrz repozytorium desktopowego LLPlayera**
(katalog `llplayer-web/`), celowo — żeby istniejący kod C#/WPF obok służył jako
**materiał referencyjny**. Przy budowie wersji webowej można podejrzeć, jak
oryginał rozwiązał dany problem.

Reference do podejrzenia w nadrzędnym repo:
- `LLPlayer/` — aplikacja i UI (logika napisów, ustawienia, zaznaczanie słów).
- `FlyleafLib/` — silnik odtwarzania (do zrozumienia, nie do przeniesienia).
- `Plugins/YoutubeDL/` — istniejąca integracja z yt-dlp.

## O co chodzi w skrócie

Wklejam link do anglojęzycznego filmu na YouTube → oglądam go w aplikacji z
napisami angielskimi i polskimi jednocześnie → zaznaczam wartościowe fragmenty
(ręcznie po polsku i po angielsku) → zapisuję je jako dwujęzyczne pary z
kontekstem (klip wideo + otaczający tekst) → później uczę się tych fragmentów
metodą fiszek z aktywnym przypominaniem.

## Kluczowe decyzje produktowe

| Wymiar | Decyzja |
|---|---|
| Język nauki | Angielski (napisy oryginalne) |
| Język tłumaczeń | Polski |
| Źródło wideo (MVP) | Wyłącznie YouTube |
| Odbiorca | Tylko ja — self-hosted, prywatny użytek, bez kont |
| Jednostka nauki | Dwujęzyczna **para fragmentów** (PL ↔ EN), nie pojedyncze słowo |
| Tworzenie pary | Ręczne — sam zaznaczam fragment PL i odpowiednik EN |
| Kontekst nauki | Klip wideo z momentu **oraz** otaczający tekst |
| Nauka | Fiszki z zapisanych par + powtórki, kontekst na odsłonięciu |

## Planowany kierunek techniczny

Pełny TypeScript, jeden codebase, jeden deploy pod self-hosted:

- **Frontend:** React + odtwarzacz z własną warstwą napisów.
- **Backend / API:** lekki serwer (Nitro lub Next.js) — orkiestracja, proxy.
- **Silnik źródła:** `yt-dlp` (binarka) — pobieranie strumienia i napisów z YouTube.
- **Tłumaczenia:** proxy do zewnętrznego API (np. DeepL/OpenAI) po stronie serwera.
- **Bez ML na start:** Whisper/ASR są poza MVP (napisy bierzemy z YouTube).

Szczegóły techniczne celowo NIE są częścią planu faz — fazy opisują wartość
biznesową i kryteria akceptacji, nie implementację.

## Dokumentacja

- [`docs/phase-0-scope.md`](docs/phase-0-scope.md) — zamknięty zakres, wizja,
  definicja MVP, ryzyka (dokument referencyjny, „konstytucja" projektu).
- [`docs/roadmap.md`](docs/roadmap.md) — wszystkie fazy 0–7 z celami biznesowymi
  i warunkami akceptacji.

## Status

- Faza 0 (walidacja i zakres) — **zamknięta**.
- Faza 1 (oglądanie filmu z linku YouTube) — **zrobiona** (w `web/`).
- Faza 2 (napisy ze źródła, EN, własna warstwa) — **zrobiona**.
- Faza 3 (napisy dwujęzyczne: autorskie EN + PL tłumaczone OpenAI) — **zrobiona**.
- Faza 4 (zaznaczanie i zapisywanie par fragmentów + kolekcja) — **zrobiona**. 🎉 **koniec MVP (Fazy 1–4)**
- Następny krok: Faza 5 (nauka fragmentów przez fiszki, z kontekstem).

## Uruchomienie (dev)

Wymaga Node oraz binarki `yt-dlp` (ścieżka w `web/.env.local`).

```bash
cd web
npm install      # tylko za pierwszym razem
npm run dev      # http://localhost:3000
```

Wklej link do filmu z YouTube → film odtwarza się w aplikacji.

## Uwaga prawna

Projekt budowany na **prywatny, niekomercyjny użytek self-hosted**. Pobieranie /
streamowanie treści YouTube przez narzędzia trzecie jest niezgodne z regulaminem
YouTube — nie publikować jako produkt publiczny bez ponownej analizy prawnej.

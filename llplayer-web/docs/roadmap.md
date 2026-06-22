# Roadmap — fazy 0–7

Plan w ujęciu **produktowo-biznesowym**. Każda faza dostarcza samodzielną wartość,
ma cel biznesowy i testowalne warunki akceptacji. Szczegóły techniczne są celowo
poza tym dokumentem.

Zakres i decyzje bazowe: zob. [`phase-0-scope.md`](phase-0-scope.md).

## Mapa wartości (kolejność dostarczania)

| Faza | Co użytkownik zyskuje | Kamień milowy |
|---|---|---|
| 0 | Ustalona wizja i zakres | Walidacja (zamknięta) |
| 1 | Oglądam film z linku YouTube | Działający odtwarzacz |
| 2 | Oglądam z napisami EN | Wartość edukacyjna |
| 3 | Napisy EN + PL naraz | Wyróżnik produktu |
| 4 | Zaznaczam i zapisuję pary fragmentów | Zbieranie materiału (koniec MVP) |
| 5 | Uczę się fiszkami z fragmentów, z klipem i tekstem | Realna nauka i powtórki |
| 6 | Aplikacja pamięta mnie i postępy | Retencja |
| 7 | Stabilny self-host | Gotowość produkcyjna |

- **MVP = Fazy 1–4.**
- **Faza 5 (fiszki)** nadaje sens Fazie 4 — najwyższy priorytet zaraz po MVP.

---

## Faza 0 — Walidacja i zakres ✅ ZAMKNIĘTA

**Cel biznesowy:** Potwierdzić, że produkt rozwiązuje realny problem i ustalić
minimalny zakres MVP, zanim powstanie kod.

Pełny dokument: [`phase-0-scope.md`](phase-0-scope.md).

---

## Faza 1 — Oglądanie filmu z linku online ✅ ZROBIONA

**Status:** zaimplementowana w `web/` (Next.js 16 + React 19). Endpoint `resolve`
(yt-dlp → metadane + format), `stream` proxy z obsługą Range (seek), strona z
polem na link i natywnym odtwarzaczem. Zweryfikowane: poprawny link gra (200/206),
seek działa (206 + Content-Range), linki błędne/spoza YouTube → czytelny komunikat.

**Znane ograniczenie (do adresacji później):** odtwarzamy najlepszy format
*progresywny* (audio+wideo w jednym), co na YouTube oznacza ~360p. Wyższe
rozdzielczości to DASH (osobne ścieżki) i wymagają łączenia przez ffmpeg —
zaplanowane jako rozszerzenie przy okazji dalszych faz.

**Cel biznesowy:** Najmniejszy działający produkt — wklejam link i oglądam film w
aplikacji. Fundament, bez którego reszta nie ma sensu.

**Co ma być zrobione:**
- Wklejenie linku do filmu YouTube.
- Odtwarzanie filmu w aplikacji (start, pauza, przewijanie, głośność).
- Czytelna informacja zwrotna, gdy linku nie da się odtworzyć.

**Warunki akceptacji (testowe):**
- Wklejam poprawny link → film zaczyna się odtwarzać.
- Mogę zapauzować, wznowić, przewinąć do dowolnego momentu i zmienić głośność.
- Wklejam zły/niewspierany link → zrozumiały komunikat, brak awarii.
- Film z YouTube odtwarza się do końca bez przerw.

---

## Faza 2 — Napisy pobierane ze źródła ✅ ZROBIONA

**Status:** zaimplementowana. `resolve` zwraca listę napisów (ręczne + auto),
parser WebVTT (`lib/vtt.ts`) czyści tagi i scala powtórki, endpoint `/api/subs`
pobiera i parsuje wybrany język, a strona renderuje własną warstwę napisów
zsynchronizowaną z `currentTime`. Domyślnie wybierany jest angielski.
Zweryfikowane: napisy EN (6 cue'ów) i DE z poprawnymi czasami, przełączanie
języka, brak napisów → komunikat, błędne parametry → 400/404.

**Uwaga:** testowano na czystych napisach ręcznych. Jakość auto-napisów
(tagi słowne, rolling) zostanie dopieszczona przy Fazie 3 na filmie z auto-PL.

**Cel biznesowy:** Pierwsza wartość edukacyjna — oglądam z napisami angielskimi
pobranymi automatycznie z YouTube, bez ręcznego dostarczania plików.

**Co ma być zrobione:**
- Automatyczne wykrycie i pobranie angielskich napisów z YouTube (autorskie + auto).
- Wyświetlanie napisów zsynchronizowanych z obrazem.
- Obsługa braku napisów (jasny komunikat).

**Warunki akceptacji (testowe):**
- Film z dostępnymi napisami → napisy pojawiają się automatycznie i są zgrane z dźwiękiem.
- Film bez napisów → aplikacja informuje o ich braku i nadal pozwala oglądać.
- Napisy są czytelne i zsynchronizowane na całej długości filmu.

---

## Faza 3 — Napisy dwujęzyczne ✅ ZROBIONA

**Status:** zaimplementowana. Dół = autorskie napisy EN (auto-napisy świadomie
pomijane), góra = PL tłumaczone z EN przez OpenAI (`/api/translate`, cache +
chunkowanie). Niezależny wybór źródła i celu tłumaczenia, wyłączanie każdej
ścieżki. Zweryfikowane end-to-end: 6 cue'ów EN → 6 PL 1:1 z czasami, DE→PL,
cache (1.1s → 0.02s), brak klucza → komunikat 503.

**Ustalenie architektoniczne (ważne):** YouTube blokuje tłumaczenie napisów
(`tlang`) twardym 429 — także przez yt-dlp. Dlatego PL **generujemy sami** z
autorskich napisów EN, a nie pobieramy z YouTube. To zgodne z docelową wizją
(własny silnik tłumaczeń) i daje lepszą jakość.

**Świadomie odłożone:** pobieranie gotowych napisów z zewnątrz (np.
opensubtitles), gdy film nie ma autorskich — wymaga decyzji o źródle/kluczu.
Kandydat na osobną fazę.

**Cel biznesowy:** Kluczowy wyróżnik — jednoczesne napisy angielskie i polskie.
Główny powód, dla którego wybiorę ten produkt zamiast zwykłego odtwarzacza.

**Co ma być zrobione:**
- Wyświetlanie dwóch ścieżek napisów jednocześnie (EN + PL).
- Wybór języka dla każdej ścieżki niezależnie.
- Podstawowe sterowanie wyglądem (rozmiar, położenie) dla czytelności obu.

**Warunki akceptacji (testowe):**
- Włączam tryb dwujęzyczny → widzę EN i PL jednocześnie, oba zgrane z obrazem.
- Oba zestawy nie nachodzą na siebie i są czytelne.
- Mogę wyłączyć jedną ścieżkę i wrócić do pojedynczych napisów.

---

## Faza 4 — Zaznaczanie i zapisywanie par fragmentów  ✅ ZROBIONA (koniec MVP)

**Status:** zaimplementowana. Przycisk „Zapisz fragment" pauzuje film i otwiera
formularz z edytowalnymi polami EN/PL (wstępnie wypełnionymi bieżącą kwestią) —
ręczna kontrola obu stron. Zapis przez `/api/fragments` do trwałego store'a JSON
(`web/data/fragments.json`, ignorowany przez git). Kolekcja z listą par, skokiem
do momentu i usuwaniem. Zapisywany jest moment, źródło i kontekst (sąsiednie
linie — pod Fazę 5). Zweryfikowane: zapis, lista, walidacja (brak EN/PL → 400),
usuwanie, oraz **trwałość po pełnym restarcie serwera** (wczytanie z pliku).

**Magazyn danych:** plik JSON po stronie serwera. Dla self-hosted single-user
wystarczający i łatwy do backupu; przy większej kolekcji można przejść na SQLite.

**Cel biznesowy:** Przekształcić oglądanie w aktywne zbieranie materiału do nauki
dokładnie tak, jak chcę — całymi frazami, dwujęzycznie, z kontekstem.

**Co ma być zrobione:**
- Ręczne zaznaczenie fragmentu w napisach polskich i osobno w angielskich.
- Zapisanie ich jako jednej pary wraz z momentem w filmie, otaczającym tekstem i źródłem.
- Podgląd zapisanej kolekcji par.
- Usuwanie pary z kolekcji.

**Warunki akceptacji (testowe):**
- Zaznaczam fragment PL i fragment EN → mogę je zapisać jako jedną parę.
- Zapisana para trafia do kolekcji i widzę w niej oba teksty.
- Przy parze odnotowany jest moment w filmie i źródło.
- Mogę usunąć parę z kolekcji.
- Kolekcja przetrwa zamknięcie i ponowne uruchomienie aplikacji.

---

## Faza 5 — Nauka fragmentów przez fiszki (z kontekstem) ✅ ZROBIONA

**Status:** zaimplementowana. Osobny tryb `/study`: każda zapisana para to fiszka,
front/rewers z odsłanianiem, przełącznik kierunku EN→PL / PL→EN. Po odsłonięciu
kontekst: odtwarzanie oryginalnego klipu w pętli [start, end] + sąsiednie linie
EN/PL. Powtórki w stylu Leitnera (`box`/`due`): „umiem" → wyższy box i późniejszy
termin, „nie umiem" → reset i powrót jeszcze w tej sesji. Stan powtórek trwały
(`/api/review` → store JSON). Zweryfikowane: normalizacja starych fragmentów,
umiem (box 0→1, due +1h), nie umiem (box 0, due +1min), 404 dla złego id, render
`/study`.

**Cel biznesowy:** Zamienić zebrane pary w realny, powtarzalny proces nauki metodą
aktywnego przypominania (fiszki) — żebym faktycznie zapamiętywał frazy, nie tylko
je kolekcjonował. Faza, która domyka sens całego zbierania.

**Co ma być zrobione:**
- Automatyczne utworzenie **fiszki z każdej zapisanej pary fragmentów** (PL ↔ EN).
- Tryb nauki: widzę jedną stronę fiszki, próbuję przypomnieć drugą, potem ją odsłaniam.
- Wybór kierunku nauki (PL→EN lub EN→PL).
- Po odsłonięciu dostępny **kontekst**: odtworzenie oryginalnego klipu **oraz** otaczający tekst (zdania przed/po).
- Prosty mechanizm powtórek — oznaczanie „umiem / nie umiem", materiał wraca z czasem.

**Warunki akceptacji (testowe):**
- Każda zapisana para pojawia się jako fiszka w trybie nauki.
- Widzę jedną stronę i mogę odsłonić drugą.
- Mogę przełączyć kierunek nauki (PL→EN / EN→PL).
- Po odsłonięciu mogę odtworzyć oryginalny klip i zobaczyć zdania dookoła.
- Oznaczam fiszkę umianą/nieumianą, a nieumiane wracają w kolejnych sesjach.
- Kolekcja fiszek przetrwa zamknięcie i ponowne uruchomienie aplikacji.

**Opcjonalnie („could"):**
- Eksport fiszek do zewnętrznego narzędzia do powtórek (np. Anki).

---

## Faza 6 — Personalizacja i ciągłość

**Cel biznesowy:** Utrzymanie użytkownika — aplikacja pamięta ustawienia i postępy,
więc powrót do nauki jest bezwysiłkowy.

**Co ma być zrobione:**
- Historia oglądanych linków i wznawianie od ostatniego momentu.
- Zapamiętane preferencje (domyślne języki, wygląd napisów).
- Łatwy powrót do wcześniej oglądanych materiałów i kolekcji.

**Warunki akceptacji (testowe):**
- Wracam po zamknięciu → widzę listę wcześniej oglądanych filmów.
- Otwieram film ponownie → odtwarzanie wznawia się od miejsca, gdzie skończyłem.
- Ustawienia językowe i wygląd napisów zachowane między sesjami.

---

## Faza 7 — Wdrożenie self-hosted i stabilność

**Cel biznesowy:** Produkt gotowy do realnego, długoterminowego użytku na własnym
serwerze — niezawodny, łatwy do uruchomienia i odporny na zmiany po stronie YouTube.

**Co ma być zrobione:**
- Prosta instalacja/uruchomienie na własnym serwerze.
- Mechanizm utrzymania działania mimo zmian po stronie YouTube (auto-aktualizacja narzędzia pobierającego).
- Obsługa błędów i komunikaty, gdy źródło chwilowo nie działa.
- Podstawowa dokumentacja uruchomienia i użycia.

**Warunki akceptacji (testowe):**
- Postępując według instrukcji, uruchamiam aplikację na własnym serwerze od zera.
- Po typowej zmianie po stronie YouTube aplikacja nadal działa lub sama się aktualizuje.
- Gdy źródło chwilowo zawodzi, dostaję jasny komunikat zamiast awarii.
- Aplikacja działa stabilnie podczas dłuższego, codziennego użytkowania.

---

## Mapa zależności faz

```
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
            (4 = koniec MVP; 5 = pierwszy priorytet po MVP)
```

## Szacunek (orientacyjny, single dev)

- MVP (Fazy 1–4): ~10–14 dni roboczych. Najwięcej ryzyka: odtwarzanie strumienia
  (Faza 1) i ergonomia zaznaczania (Faza 4).
- Faza 5 (fiszki + kontekst): ~3–5 dni.
- Fazy 6–7: ~3–4 dni.

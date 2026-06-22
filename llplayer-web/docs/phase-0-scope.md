# Faza 0 — Walidacja i zakres (ZAMKNIĘTA)

Dokument referencyjny projektu. Ustala, **co** budujemy i **dla kogo**, zanim
powstanie kod. Wszystkie kolejne fazy muszą być z nim zgodne.

## 1. Decyzje bazowe

| Wymiar | Decyzja |
|---|---|
| Język nauki | Angielski (napisy oryginalne) |
| Język tłumaczeń | Polski |
| Źródło wideo na MVP | Wyłącznie YouTube |
| Odbiorca | Tylko ja (self-hosted, prywatny użytek) |
| Logowanie / konta | Brak — jeden użytkownik, bez autoryzacji |
| Jednostka nauki | Dwujęzyczna **para fragmentów** (PL ↔ EN), nie pojedyncze słowo |
| Tworzenie pary | Ręczne — sam zaznaczam fragment PL i osobno odpowiednik EN |
| Kontekst do nauki | Klip wideo z danego momentu **oraz** otaczający tekst (zdania przed/po) |
| Lookup słowa | Pomocniczo (zrozumienie słowa przy zaznaczaniu) — nie jest rdzeniem |

## 2. Użytkownik docelowy

Jedna osoba — uczy się angielskiego, ogląda anglojęzyczne filmy na YouTube i chce
uczyć się aktywnie: czytać oryginał, mieć polskie tłumaczenie pod ręką i zbierać
wartościowe frazy do późniejszej nauki, bez wychodzenia z odtwarzacza.

## 3. Czym jest „jednostka nauki"

Zapisany element nauki to **kolekcjonowana para** zawierająca:

- zaznaczony fragment po polsku,
- zaznaczony odpowiednik po angielsku,
- **kotwicę w filmie** (moment + zakres czasu) — do odtworzenia oryginalnego klipu,
- **otaczający tekst** (kilka kwestii przed i po) — by fragment nie był wyrwany z kontekstu,
- źródło (link do filmu, tytuł).

Pary trafiają do osobistej **kolekcji fragmentów**, z której później powstają fiszki.

## 4. Główny scenariusz użycia (happy path)

> Wklejam link do anglojęzycznego filmu na YouTube → film odtwarza się w aplikacji
> z angielskimi napisami → włączam drugą ścieżkę po polsku → trafiam na wartościowy
> fragment → ręcznie zaznaczam jego wersję polską i angielską → aplikacja zapisuje
> parę wraz z momentem w filmie i otaczającym tekstem → później wchodzę do kolekcji
> i uczę się fragmentów fiszkami, a przy każdej mogę odtworzyć oryginalny klip i
> zobaczyć zdania dookoła → wracam następnego dnia i wznawiam od miejsca, w którym
> skończyłem.

## 5. Zakres MVP (Fazy 1–4)

**W zakresie:**

- Odtwarzanie filmów YouTube z linku.
- Angielskie napisy pobierane automatycznie z YouTube (autorskie + auto-generowane).
- Druga ścieżka napisów po polsku.
- Ręczne zaznaczanie i zapisywanie dwujęzycznych par fragmentów z kontekstem.

**Poza zakresem MVP (świadomie odłożone):**

- Inne źródła niż YouTube.
- Whisper / generowanie napisów AI (jedynie ewentualny fallback po MVP).
- Inne języki nauki niż angielski.
- Konta, wielu użytkowników, współdzielenie.
- OCR napisów obrazkowych.

## 6. Kryteria sukcesu MVP (mierzalne)

1. **Pokrycie:** ≥ 90% wybranych anglojęzycznych filmów YouTube odtwarza się i pokazuje angielskie napisy.
2. **Kompletność sesji:** Mogę obejrzeć cały film (15–30 min) bez zawieszki i bez rozjazdu napisów.
3. **Wartość edukacyjna:** Dla dowolnego fragmentu mogę szybko zapisać dwujęzyczną parę z kontekstem.
4. **Bez frustracji:** Gdy coś nie działa (brak napisów, zły link), dostaję zrozumiały komunikat zamiast awarii.

## 7. Założenia

- YouTube udostępnia napisy (autorskie lub auto) dla większości interesujących treści → Whisper niepotrzebny na start.
- Jeden użytkownik = brak potrzeby kont, kolejek, skalowania.
- Self-hosted na własnej maszynie = pełna kontrola, brak kosztów infrastruktury poza serwerem.

## 8. Ryzyka biznesowe (świadome)

| Ryzyko | Charakter | Postawa |
|---|---|---|
| Regulamin YouTube zabrania pobierania/streamowania przez narzędzia trzecie | Prawne | Akceptowalne dla prywatnego, niekomercyjnego self-hostu; **nie** publikować jako produkt publiczny bez rewizji. |
| YouTube zmienia API i psuje pobieranie | Techniczno-operacyjne | Adresowane w Fazie 7 (auto-aktualizacja narzędzia pobierającego). |
| Część filmów bez napisów | Produktowe | Jasny komunikat na MVP; Whisper jako opcja po MVP. |
| Ergonomia ręcznego zaznaczania dwóch fragmentów | UX | Główny punkt do dopracowania w Fazie 4 (wygodne zaznaczanie, najlepiej na pauzie). |
| Trwałość kolekcji fragmentów/fiszek | Dane | To dane do nauki — nie wolno ich stracić między sesjami/restartami. |

## 9. Definition of Done — Faza 0

- [x] Zdefiniowany użytkownik i jeden główny scenariusz „od linku do nauki".
- [x] Zatwierdzone źródło (YouTube) i para językowa (EN → PL).
- [x] Jednostka nauki = dwujęzyczna para fragmentów z kontekstem.
- [x] Sposób tworzenia pary (ręcznie oba) i forma kontekstu (klip + tekst) ustalone.
- [x] Spisany zakres MVP i to, co jest poza nim.
- [x] Mierzalne kryteria sukcesu MVP.
- [x] Zidentyfikowane ryzyka i postawa wobec nich.

**Status: ZAMKNIĘTA — gotowe do startu Fazy 1.**

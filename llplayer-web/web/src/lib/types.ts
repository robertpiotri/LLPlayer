// Wspoldzielone typy (bez zaleznosci serwerowych — bezpieczne do importu w kliencie).

export type Fragment = {
  id: string;
  createdAt: number;
  // Zrodlo
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  // Moment w filmie
  timeStart: number;
  timeEnd: number;
  // Para
  en: string;
  pl: string;
  // Kontekst (sasiednie linie) — nauka w kontekscie
  contextEn: string[];
  contextPl: string[];
  // Stan powtorek (SRS w stylu Leitnera)
  box: number; // poziom pudelka (0 = nowa / nieumiana)
  due: number; // timestamp nastepnej powtorki
  lastReviewed: number | null;
};

// Klient wysyla tylko tresc — id, czas utworzenia i stan powtorek ustawia serwer.
export type NewFragment = Omit<
  Fragment,
  "id" | "createdAt" | "box" | "due" | "lastReviewed"
>;

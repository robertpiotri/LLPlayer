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
  // Kontekst (sasiednie linie) — pod Faze 5 (nauka w kontekscie)
  contextEn: string[];
  contextPl: string[];
};

export type NewFragment = Omit<Fragment, "id" | "createdAt">;

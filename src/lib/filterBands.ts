// Ordre canonique des filtres : L R V B S H O, couleur de fond = bande passante.
// Partagé entre la page Frames (tri des lignes) et l'onglet Qualité (onglets du graphique).
export const FILTER_BANDS: { keys: string[]; order: number; bg: string; fg: string }[] = [
  { keys: ["L", "LUM", "LUMINANCE", "CLEAR", "C"], order: 0, bg: "hsl(0, 0%, 92%)", fg: "hsl(222, 47%, 8%)" },
  { keys: ["R", "RED"], order: 1, bg: "hsl(0, 75%, 50%)", fg: "hsl(0, 0%, 100%)" },
  { keys: ["V", "G", "GREEN", "VERT"], order: 2, bg: "hsl(130, 65%, 40%)", fg: "hsl(0, 0%, 100%)" },
  { keys: ["B", "BLUE", "BLEU"], order: 3, bg: "hsl(220, 85%, 55%)", fg: "hsl(0, 0%, 100%)" },
  { keys: ["S", "SII", "S2", "SULFUR"], order: 4, bg: "hsl(350, 80%, 32%)", fg: "hsl(0, 0%, 100%)" },
  { keys: ["H", "HA", "HALPHA", "H-ALPHA"], order: 5, bg: "hsl(355, 85%, 45%)", fg: "hsl(0, 0%, 100%)" },
  { keys: ["O", "OIII", "O3", "OXYGEN"], order: 6, bg: "hsl(180, 75%, 45%)", fg: "hsl(222, 47%, 8%)" },
];

export const filterBand = (name: string | null | undefined) => {
  const k = (name ?? "").trim().toUpperCase();
  return (
    FILTER_BANDS.find((b) => b.keys.includes(k)) ?? {
      order: 99,
      bg: "hsl(var(--secondary))",
      fg: "hsl(var(--foreground))",
    }
  );
};

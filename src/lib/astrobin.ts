export interface AstroBinFilterRow {
  raw: string;
  filter: string;
  count: number;
  exposure: number;
}

export interface AstroBinImport {
  title: string | null;
  author: string | null;
  published: string | null;
  totalIntegration: string | null;
  url: string | null;
  imageUrl: string | null;
  filters: AstroBinFilterRow[];
}

const FILTER_ALIASES: Record<string, string> = {
  "hα": "Ha", "ha": "Ha", "h-alpha": "Ha", "halpha": "Ha", "h alpha": "Ha", "h": "Ha",
  "oiii": "OIII", "o3": "OIII", "oxygen iii": "OIII", "[oiii]": "OIII", "o": "OIII",
  "sii": "SII", "s2": "SII", "sulfur ii": "SII", "[sii]": "SII", "s": "SII",
  "l": "L", "lum": "L", "luminance": "L",
  "r": "R", "red": "R", "rouge": "R",
  "g": "G", "green": "G", "vert": "G", "v": "G",
  "b": "B", "blue": "B", "bleu": "B",
  "uv": "UV", "ir": "IR", "uv/ir": "IR",
};


export const normalizeFilter = (raw: string): string => {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return FILTER_ALIASES[key] ?? raw.trim();
};

/** Parse the plain-text description exported by AstroBin. */
export const parseAstroBin = (text: string): AstroBinImport => {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const title = nonEmpty[0] ?? null;

  const find = (re: RegExp) => {
    for (const l of nonEmpty) {
      const m = l.match(re);
      if (m) return m[1].trim();
    }
    return null;
  };

  const author = find(/^(?:par|by)\s+(.+)$/i);
  const published = find(/^(?:publié|published)\s*:\s*(.+)$/i);
  const totalIntegration = find(/^(?:intégration totale|total integration)\s*:\s*(.+)$/i);
  const url = find(/(https?:\/\/\S*astrobin\S*)/i);

  // Image URL: direct image link (AstroBin CDN or any image url) pasted in the text
  const allUrls = (text.match(/https?:\/\/\S+/gi) ?? []).map((u) => u.replace(/[),.;]+$/, ""));
  const imageUrl =
    allUrls.find((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) ??
    allUrls.find((u) => /cdn\.astrobin\.com|astrob\.in\/.+\/\d+/i.test(u)) ??
    null;

  // Filter lines: "- Hα: 13h 5m (157 × 300")"
  const filters: AstroBinFilterRow[] = [];
  const lineRe = /^[-•*]?\s*([^:]{1,40}?)\s*:\s*[^()]*\(\s*(\d+)\s*[x×X]\s*([\d.,]+)\s*(?:"|s|sec|secondes?)?\s*\)/;
  for (const l of nonEmpty) {
    if (/^[-•*]?\s*(télescope|telescope|caméra|camera|monture|mount|filtres|filters|accessoires|accessories|logiciel|software|équipement|equipement|equipment)\s*:/i.test(l)) continue;
    const m = l.match(lineRe);
    if (!m) continue;
    const count = parseInt(m[2], 10);
    const exposure = parseFloat(m[3].replace(",", "."));
    if (!count || !exposure) continue;
    filters.push({ raw: m[1].trim(), filter: normalizeFilter(m[1]), count, exposure });
  }

  return { title, author, published, totalIntegration, url, imageUrl, filters };
};

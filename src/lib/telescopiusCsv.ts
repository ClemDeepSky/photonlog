// Robust parser for Telescopius mosaic CSV exports.
// Handles quoted fields, "," ";" or tab delimiters and header-based column detection.

export interface CsvPane {
  pane_number: number;
  ra: string;
  dec: string;
  position_angle: number | null;
  pane_width: number | null;
  pane_height: number | null;
  overlap: number | null;
  row_index: number | null;
  col_index: number | null;
}

const splitLine = (line: string, delim: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"' && cur.trim() === "") inQ = true; // guillemet ouvrant seulement en début de champ : les " symboles de secondes d'arc sont conservés
    else if (ch === delim) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
};

const detectDelimiter = (line: string): string => {
  const outside = line.replace(/"(?:[^"]|"")*"/g, "");
  const counts = [",", ";", "\t"].map((d) => [d, outside.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
};

const num = (s?: string): number | null => {
  if (!s) return null;
  const v = parseFloat(s.replace("%", "").replace(",", ".").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(v) ? v : null;
};

export const parseTelescopiusCsv = (text: string): CsvPane[] => {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const delim = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delim).map((h) => h.toLowerCase());
  const hasHeader = first.some((h) => /\bra\b|right asc|ascension/.test(h)) || first.some((h) => /pane|panel/.test(h));

  // Default column order: Pane, RA, DEC, PA, Width, Height, Overlap, Row, Column
  const idx = { pane: 0, ra: 1, dec: 2, pa: 3, w: 4, h: 5, ov: 6, row: 7, col: 8 };
  if (hasHeader) {
    const find = (re: RegExp) => first.findIndex((h) => re.test(h));
    const set = (k: keyof typeof idx, re: RegExp) => { const i = find(re); if (i >= 0) idx[k] = i; };
    set("pane", /pane|panel|^#|name/);
    set("ra", /^ra\b|\bra\b|right asc|ascension/);
    set("dec", /^dec|declin/);
    set("pa", /angle|^pa\b|rotation/);
    set("w", /width/);
    set("h", /height/);
    set("ov", /overlap/);
    set("row", /^row/);
    set("col", /^col/);
  }

  const parsed: CsvPane[] = [];
  for (const line of hasHeader ? lines.slice(1) : lines) {
    const p = splitLine(line, delim);
    if (p.length < 3) continue;
    const ra = p[idx.ra] || "";
    const dec = p[idx.dec] || "";
    if (!ra || !dec) continue;
    parsed.push({
      pane_number: parseInt((p[idx.pane] || "").replace(/[^\d]/g, "")) || parsed.length + 1,
      ra, dec,
      position_angle: num(p[idx.pa]),
      pane_width: num(p[idx.w]),
      pane_height: num(p[idx.h]),
      overlap: num(p[idx.ov]),
      row_index: num(p[idx.row]),
      col_index: num(p[idx.col]),
    });
  }
  return parsed;
};

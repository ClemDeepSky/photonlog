// Analyse des noms de fichiers d'acquisition (aucun contenu de fichier n'est lu).
//
// Deux niveaux :
//  1. Si le projet fournit un modèle de nommage (type N.I.N.A. avec des jetons
//     $$FILTER$$, $$FWHM$$, ...), on en déduit une expression régulière et on
//     extrait toutes les métadonnées disponibles.
//  2. Sinon (ou si le modèle ne colle pas), on retombe sur une détection souple
//     du filtre et du panneau à partir des dossiers et segments du nom.

export interface ParsedFrame {
  /** Filtre détecté (normalisé : L, R, G, B, Ha, OIII, SII…) */
  filter: string | null;
  /** Numéro de panneau détecté, si applicable */
  paneNumber: number | null;
  /** Type d'image (LIGHT, DARK, FLAT…) si présent dans le nom */
  imageType: string | null;
  /** Date/heure de prise de vue (ISO) si présentes */
  capturedAt: string | null;
  exposureDuration: number | null;
  fwhm: number | null;
  eccentricity: number | null;
  hfr: number | null;
  starCount: number | null;
  sensorTemp: number | null;
  frameNr: number | null;
  /** true si le modèle de nommage a été appliqué avec succès */
  matchedPattern: boolean;
}

/* ------------------------------------------------------------------ */
/* Extensions et filtres                                              */
/* ------------------------------------------------------------------ */

export const ASTRO_EXTENSIONS = new Set([
  "fit", "fits", "fts", "xisf", "tif", "tiff", "cr2", "cr3", "nef", "arw", "png", "jpg", "jpeg",
]);

export function isAstroFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ASTRO_EXTENSIONS.has(ext);
}

const KNOWN_FILTERS = ["L", "R", "G", "B", "Ha", "OIII", "SII", "UV", "IR", "Lum", "Red", "Green", "Blue"];

const FILTER_ALIASES: Record<string, string> = {
  lum: "L", luminance: "L", luminosity: "L",
  red: "R", green: "G", blue: "B", v: "G", vert: "G",
  h: "Ha", halpha: "Ha", h_alpha: "Ha", "h-alpha": "Ha", ha: "Ha",
  o: "OIII", oiii: "OIII", o3: "OIII",
  s: "SII", sii: "SII", s2: "SII",
};

export function normalizeFilter(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  if (!lower) return null;
  if (FILTER_ALIASES[lower]) return FILTER_ALIASES[lower];
  const direct = KNOWN_FILTERS.find((f) => f.toLowerCase() === lower);
  if (direct) return direct;
  return null;
}

export function detectFilterFromPath(filePath: string): string | null {
  const parts = filePath.replace(/\\/g, "/").split("/");
  for (let i = parts.length - 2; i >= 0; i--) {
    const fromFolder = normalizeFilter(parts[i]);
    if (fromFolder) return fromFolder;
  }
  const nameWithoutExt = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  for (const seg of nameWithoutExt.split(/[_\-\s]+/)) {
    const fromSeg = normalizeFilter(seg);
    if (fromSeg) return fromSeg;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Panneaux                                                           */
/* ------------------------------------------------------------------ */

const PANE_PATTERNS = [
  /\b(?:panneau|panel|pane|tile|tuile|mosaic|mosaique)[\s_\-]*0*(\d{1,3})(?!\d)/i,
  /\b[pt]0*(\d{1,3})\b/i,
];

function detectPaneFromSegment(segment: string): number | null {
  for (const re of PANE_PATTERNS) {
    const m = segment.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

export function detectPaneFromPath(filePath: string): number | null {
  const parts = filePath.replace(/\\/g, "/").split("/");
  for (let i = parts.length - 2; i >= 0; i--) {
    const found = detectPaneFromSegment(parts[i]);
    if (found !== null) return found;
  }
  const nameWithoutExt = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  const whole = nameWithoutExt.match(PANE_PATTERNS[0]);
  if (whole) {
    const n = parseInt(whole[1], 10);
    if (n > 0) return n;
  }
  for (const seg of nameWithoutExt.split(/[_\-\s]+/)) {
    const found = detectPaneFromSegment(seg);
    if (found !== null) return found;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Durée d'exposition (dossiers ou segments du nom)                   */
/* ------------------------------------------------------------------ */

// Ex. "300s", "300sec", "300.0s", "EXP_300", "exposure300", "5min", "120s_Ha"
const EXPO_PATTERNS: [RegExp, number][] = [
  [/(?:^|[^a-z0-9.])(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?|secondes?)(?![a-z])/i, 1],
  [/(?:^|[^a-z0-9.])(\d+(?:[.,]\d+)?)\s*(?:m|min|mins|minutes?)(?![a-z])/i, 60],
  [/(?:exp|expo|exposure|exptime|pose)[\s_\-=]*(\d+(?:[.,]\d+)?)/i, 1],
];

function detectExposureFromSegment(seg: string): number | null {
  for (const [re, mult] of EXPO_PATTERNS) {
    const m = seg.match(re);
    if (m) {
      const n = parseFloat(m[1].replace(",", ".")) * mult;
      if (!isNaN(n) && n > 0 && n <= 7200) return n;
    }
  }
  return null;
}

/** Cherche la durée dans le nom du fichier, puis dans les dossiers parents. */
export function detectExposureFromPath(filePath: string): number | null {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const name = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  const fromName = detectExposureFromSegment(name);
  if (fromName !== null) return fromName;
  for (let i = parts.length - 2; i >= 0; i--) {
    const found = detectExposureFromSegment(parts[i]);
    if (found !== null) return found;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Modèle de nommage                                                  */
/* ------------------------------------------------------------------ */

const NUMBER = "(?:[-+]?\\d+(?:[.,]\\d+)?|NaN|nan)";

const TOKEN_REGEX: Record<string, string> = {
  DATE: "\\d{4}[-_/]\\d{2}[-_/]\\d{2}",
  DATEMINUS12: "\\d{4}[-_/]\\d{2}[-_/]\\d{2}",
  TIME: "\\d{2}[-:]\\d{2}[-:]\\d{2}",
  DATETIME: "\\d{4}[-_/]\\d{2}[-_/]\\d{2}[ _T]\\d{2}[-:]\\d{2}[-:]\\d{2}",
  SENSORTEMP: NUMBER,
  EXPOSURETIME: NUMBER,
  FWHM: NUMBER,
  ECCENTRICITY: NUMBER,
  HFR: NUMBER,
  STARCOUNT: "\\d+",
  FRAMENR: "\\d+",
  GAIN: NUMBER,
  OFFSET: NUMBER,
  BINNING: "[\\dxX]+",
  ROTATORANGLE: NUMBER,
  FILTER: "[^_]+",
  IMAGETYPE: "[A-Za-z]+",
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface CompiledPattern {
  regex: RegExp;
  tokens: string[];
}

const cache = new Map<string, CompiledPattern | null>();

/** Compile un modèle du type `$$TARGETNAME$$_$$FILTER$$_$$FWHM$$` en regex. */
export function compilePattern(pattern: string | null | undefined): CompiledPattern | null {
  const raw = (pattern || "").trim();
  if (!raw) return null;
  if (cache.has(raw)) return cache.get(raw)!;

  const tokens: string[] = [];
  let body = "";
  const re = /\$\$([A-Z0-9]+)\$\$/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw))) {
    body += escapeRe(raw.slice(last, m.index));
    const token = m[1];
    tokens.push(token);
    const inner = TOKEN_REGEX[token] || "[^_]+?";
    body += `(?<t${tokens.length - 1}>${inner})`;
    last = m.index + m[0].length;
  }
  body += escapeRe(raw.slice(last));

  let compiled: CompiledPattern | null = null;
  if (tokens.length > 0) {
    try {
      compiled = { regex: new RegExp(`^${body}$`, "i"), tokens };
    } catch {
      compiled = null;
    }
  }
  cache.set(raw, compiled);
  return compiled;
}

const num = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
};

const int = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

const empty = (): ParsedFrame => ({
  filter: null, paneNumber: null, imageType: null, capturedAt: null,
  exposureDuration: null, fwhm: null, eccentricity: null, hfr: null,
  starCount: null, sensorTemp: null, frameNr: null, matchedPattern: false,
});

function buildDate(date?: string, time?: string, datetime?: string): string | null {
  if (datetime) {
    const cleaned = datetime.replace(/[_ ]/, "T");
    const [d, t = "00-00-00"] = cleaned.split("T");
    return buildDate(d, t);
  }
  if (!date) return null;
  const d = date.replace(/[_/]/g, "-");
  const t = (time || "00-00-00").replace(/[-]/g, ":");
  const iso = `${d}T${t}`;
  const parsed = new Date(iso);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Analyse un fichier : applique le modèle si possible, sinon détection souple.
 * `relativePath` sert à la détection par dossiers (filtre/panneau).
 */
export function parseFrameName(relativePath: string, pattern?: string | null): ParsedFrame {
  const fileName = relativePath.replace(/\\/g, "/").split("/").pop() || relativePath;
  const base = fileName.replace(/\.[^.]+$/, "");
  const result = empty();

  const compiled = compilePattern(pattern);
  if (compiled) {
    const m = base.match(compiled.regex);
    if (m?.groups) {
      result.matchedPattern = true;
      const g: Record<string, string | undefined> = {};
      compiled.tokens.forEach((token, i) => {
        g[token] = m.groups![`t${i}`];
      });
      result.filter = g.FILTER ? normalizeFilter(g.FILTER) || g.FILTER.trim() : null;
      result.imageType = g.IMAGETYPE ? g.IMAGETYPE.toUpperCase() : null;
      result.capturedAt = buildDate(g.DATE || g.DATEMINUS12, g.TIME, g.DATETIME);
      result.exposureDuration = num(g.EXPOSURETIME);
      result.fwhm = num(g.FWHM);
      result.eccentricity = num(g.ECCENTRICITY);
      result.hfr = num(g.HFR);
      result.starCount = int(g.STARCOUNT);
      result.sensorTemp = num(g.SENSORTEMP);
      result.frameNr = int(g.FRAMENR);
    }
  }

  if (!result.filter) result.filter = detectFilterFromPath(relativePath);
  if (result.exposureDuration == null) result.exposureDuration = detectExposureFromPath(relativePath);
  result.paneNumber = detectPaneFromPath(relativePath);
  return result;
}

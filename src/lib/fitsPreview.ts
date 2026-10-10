// Décodage minimal de fichiers FITS pour un aperçu visuel dans le navigateur.
// On lit l'en-tête (blocs de 2880 octets, cartes de 80 caractères), puis le plan
// image principal, et on applique un étirement automatique (percentiles) pour
// obtenir une vignette lisible. Tout se passe localement, rien n'est envoyé.

export interface FitsPreview {
  /** Pixels décodés (après BZERO/BSCALE), ligne du bas en premier (ordre FITS). */
  pixels: Float32Array;
  width: number;
  height: number;
  header: Record<string, string | number>;
}

/** Niveaux d'étirement : percentiles bas/haut + gamma. */
export const STRETCH_LEVELS = [
  { id: 0, label: "Auto-stretch", lo: 0.000635, hi: 0.9999, gamma: 0.462 },
] as const;

/** Paramètres d'un auto-stretch : point noir, mid-ton et point blanc. */
export interface StretchParams {
  black: number;
  mid: number;
  white: number;
}

const CARD = 80;
const BLOCK = 2880;

export function isFitsName(name: string): boolean {
  return /\.(fits?|fit|fts)$/i.test(name);
}

function parseHeader(buf: ArrayBuffer): { header: Record<string, string | number>; dataStart: number } {
  const bytes = new Uint8Array(buf);
  const header: Record<string, string | number> = {};
  let offset = 0;
  let done = false;
  while (!done && offset < bytes.length) {
    for (let i = 0; i < BLOCK / CARD; i++) {
      const start = offset + i * CARD;
      if (start + CARD > bytes.length) return { header, dataStart: bytes.length };
      let card = "";
      for (let j = 0; j < CARD; j++) card += String.fromCharCode(bytes[start + j]);
      const key = card.slice(0, 8).trim();
      if (key === "END") {
        done = true;
        break;
      }
      if (!key || card[8] !== "=") continue;
      let value = card.slice(9).split("/")[0].trim().replace(/^'|'$/g, "").trim();
      const num = Number(value);
      header[key] = value !== "" && !Number.isNaN(num) ? num : value;
    }
    offset += BLOCK;
  }
  return { header, dataStart: offset };
}

function readPixels(
  buf: ArrayBuffer,
  dataStart: number,
  count: number,
  bitpix: number
): Float32Array {
  const out = new Float32Array(count);
  const view = new DataView(buf);
  const size = Math.abs(bitpix) / 8;
  const max = Math.min(count, Math.floor((buf.byteLength - dataStart) / size));
  for (let i = 0; i < max; i++) {
    const p = dataStart + i * size;
    switch (bitpix) {
      case 8:
        out[i] = view.getUint8(p);
        break;
      case 16:
        out[i] = view.getInt16(p, false);
        break;
      case 32:
        out[i] = view.getInt32(p, false);
        break;
      case -32:
        out[i] = view.getFloat32(p, false);
        break;
      case -64:
        out[i] = view.getFloat64(p, false);
        break;
      default:
        out[i] = 0;
    }
  }
  return out;
}


/**
 * Auto-stretch façon Siril/PixInsight : le point noir est posé à moyenne − 2,8 σ
 * (bruit de fond), le mid-ton à la médiane, et le rendu passe par une fonction de
 * transfert des mid-tons (MTF). Le fond reste noir, les nébulosités ressortent.
 */
export function computeAutostretch(preview: FitsPreview): StretchParams {
  const px = preview.pixels;
  const step = Math.max(1, Math.floor(px.length / 200000));
  const sample: number[] = [];
  let sum = 0;
  for (let i = 0; i < px.length; i += step) {
    const v = px[i];
    if (Number.isFinite(v)) {
      sample.push(v);
      sum += v;
    }
  }
  if (sample.length === 0) return { black: 0, mid: 0.5, white: 1 };
  sample.sort((a, b) => a - b);
  const pct = (q: number) => sample[Math.min(sample.length - 1, Math.max(0, Math.floor(sample.length * q)))];
  const mean = sum / sample.length;
  let sumSq = 0;
  for (const v of sample) sumSq += (v - mean) * (v - mean);
  const std = Math.sqrt(sumSq / sample.length);

  const mid = pct(0.5);
  let black = mean - 2.8 * std;
  // Sécurités : point noir cohérent avec le fond, jamais au-dessus du mid-ton.
  if (!(black < mid)) black = pct(0.001);
  let white = pct(0.9995);
  if (!(white > mid)) white = sample[sample.length - 1];
  if (!(white > mid)) white = mid + 1;
  return { black, mid, white };
}

/** Application de la MTF (fonction de transfert des mid-tons) à une valeur normalisée. */
function mtf(x: number, mid: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (mid <= 0) return x >= 0.5 ? 1 : 0;
  if (mid >= 1) return 0;
  return ((mid - 1) * x) / ((2 * mid - 1) * x - mid);
}

/** Rend les pixels décodés en canvas avec l'auto-stretch appliqué. */
export function stretchToCanvas(preview: FitsPreview, _level: number = 0, maxSide = 1400): HTMLCanvasElement {
  const px = preview.pixels;
  const w = preview.width;
  const h = preview.height;
  const params = computeAutostretch(preview);
  const range = params.white - params.black || 1;
  const mid = Math.min(0.99, Math.max(0.01, (params.mid - params.black) / range));

  // Réduction éventuelle pour rester léger à l'affichage.
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(dw, dh);

  for (let y = 0; y < dh; y++) {
    // Les FITS sont stockés de bas en haut : on inverse l'axe vertical.
    const sy = Math.min(h - 1, Math.round((y / dh) * h));
    const srcRow = (h - 1 - sy) * w;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(w - 1, Math.round((x / dw) * w));
      let v = (px[srcRow + sx] - params.black) / range;
      v = v <= 0 ? 0 : v >= 1 ? 1 : v;
      const g = Math.round(255 * mtf(v, mid));
      const o = (y * dw + x) * 4;
      img.data[o] = g;
      img.data[o + 1] = g;
      img.data[o + 2] = g;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}


/** Décode un FITS en pixels bruts (mono ou première couche). */
export async function decodeFitsToCanvas(file: File): Promise<FitsPreview> {
  const buf = await file.arrayBuffer();
  const { header, dataStart } = parseHeader(buf);
  const w = Number(header.NAXIS1);
  const h = Number(header.NAXIS2);
  const bitpix = Number(header.BITPIX);
  if (!w || !h || !bitpix) throw new Error("En-tête FITS illisible");

  const bzero = Number(header.BZERO ?? 0) || 0;
  const bscale = Number(header.BSCALE ?? 1) || 1;
  const px = readPixels(buf, dataStart, w * h, bitpix);
  if (bzero !== 0 || bscale !== 1) {
    for (let i = 0; i < px.length; i++) px[i] = px[i] * bscale + bzero;
  }
  return { pixels: px, width: w, height: h, header };
}

/** Rend les pixels décodés en canvas avec le niveau d'étirement choisi. */
export function stretchToCanvas(preview: FitsPreview, level: number, maxSide = 1400): HTMLCanvasElement {
  const px = preview.pixels;
  const w = preview.width;
  const h = preview.height;
  const spec = STRETCH_LEVELS[level] ?? STRETCH_LEVELS[0];
  const [lo, hi] = stretchBounds(px, spec.lo, spec.hi);
  const range = hi - lo || 1;

  // Réduction éventuelle pour rester léger à l'affichage.
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(dw, dh);

  for (let y = 0; y < dh; y++) {
    // Les FITS sont stockés de bas en haut : on inverse l'axe vertical.
    const sy = Math.min(h - 1, Math.round((y / dh) * h));
    const srcRow = (h - 1 - sy) * w;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(w - 1, Math.round((x / dw) * w));
      let v = (px[srcRow + sx] - lo) / range;
      v = v <= 0 ? 0 : v >= 1 ? 1 : v;
      // Léger gamma pour révéler les zones faibles.
      const g = Math.round(255 * Math.pow(v, spec.gamma));
      const o = (y * dw + x) * 4;
      img.data[o] = g;
      img.data[o + 1] = g;
      img.data[o + 2] = g;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

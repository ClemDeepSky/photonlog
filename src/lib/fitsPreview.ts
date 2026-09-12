// Décodage minimal de fichiers FITS pour un aperçu visuel dans le navigateur.
// On lit l'en-tête (blocs de 2880 octets, cartes de 80 caractères), puis le plan
// image principal, et on applique un étirement automatique (percentiles) pour
// obtenir une vignette lisible. Tout se passe localement, rien n'est envoyé.

export interface FitsPreview {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  header: Record<string, string | number>;
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

/** Étirement automatique par percentiles (0.5 % / 99.5 %) sur un échantillon. */
function autoStretchBounds(px: Float32Array): [number, number] {
  const step = Math.max(1, Math.floor(px.length / 200000));
  const sample: number[] = [];
  for (let i = 0; i < px.length; i += step) {
    const v = px[i];
    if (Number.isFinite(v)) sample.push(v);
  }
  if (sample.length === 0) return [0, 1];
  sample.sort((a, b) => a - b);
  const lo = sample[Math.floor(sample.length * 0.005)];
  const hi = sample[Math.floor(sample.length * 0.995)];
  return hi > lo ? [lo, hi] : [sample[0], sample[sample.length - 1] || sample[0] + 1];
}

/** Décode un FITS en canvas prêt à afficher (mono ou première couche couleur). */
export async function decodeFitsToCanvas(file: File, maxSide = 1400): Promise<FitsPreview> {
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

  const [lo, hi] = autoStretchBounds(px);
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
      const g = Math.round(255 * Math.pow(v, 0.45));
      const o = (y * dw + x) * 4;
      img.data[o] = g;
      img.data[o + 1] = g;
      img.data[o + 2] = g;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, width: w, height: h, header };
}

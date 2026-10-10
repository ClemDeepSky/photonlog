const num = (s: string) => (s.match(/-?\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(",", ".")));
export function parseRaDeg(ra?: string | null): number | null {
  if (!ra) return null;
  const n = num(ra); if (!n.length) return null;
  if (n.length === 1 && !/h/i.test(ra)) return n[0] > 24 ? n[0] : n[0] * 15;
  return ((n[0] || 0) + (n[1] || 0) / 60 + (n[2] || 0) / 3600) * 15;
}
export function parseDecDeg(dec?: string | null): number | null {
  if (!dec) return null;
  const n = num(dec); if (!n.length) return null;
  const neg = dec.trim().startsWith("-");
  const v = Math.abs(n[0]) + (n[1] || 0) / 60 + (n[2] || 0) / 3600;
  return neg ? -v : v;
}
/** Vignette par défaut : image du ciel (DSS2) centrée sur le cadrage du projet. */
export function skyThumbnailUrl(ra?: string | null, dec?: string | null, fovDeg = 3): string | null {
  const r = parseRaDeg(ra), d = parseDecDeg(dec);
  if (r == null || d == null) return null;
  return `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&width=640&height=400&fov=${fovDeg}&projection=TAN&ra=${r.toFixed(5)}&dec=${d.toFixed(5)}&format=jpg`;
}

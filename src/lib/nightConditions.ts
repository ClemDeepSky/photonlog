import * as Astronomy from "astronomy-engine";

export type ObservingSite = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  timezone: string | null;
};

export type NightConditions = {
  duskAstro: Date | null; // fin du crépuscule astronomique (soir)
  dawnAstro: Date | null; // début du crépuscule astronomique (matin)
  moonRise: Date | null;
  moonSet: Date | null;
  illumination: number;
  moonAltMaxDuringAcq: number | null;
  separation: number | null; // lune ↔ cible, degrés
  curve: { t: number; alt: number }[]; // hauteur de la lune du crépuscule à l'aube
};

const parseSexa = (str: string) => {
  const nums = str?.match(/[+-]?\d+(?:[.,]\d+)?/g);
  if (!nums) return null;
  const [a, b, c] = nums.map((n) => parseFloat(n.replace(",", ".")));
  const sign = /^\s*-/.test(str) || a < 0 ? -1 : 1;
  return { v: sign * (Math.abs(a) + (b || 0) / 60 + (c || 0) / 3600), parts: nums.length };
};
export const parseRaDeg = (s: string | null | undefined) => {
  if (!s) return null;
  const p = parseSexa(s);
  if (!p) return null;
  return p.parts > 1 || /h/i.test(s) ? p.v * 15 : p.v;
};
export const parseDecDeg = (s: string | null | undefined) => (s ? parseSexa(s)?.v ?? null : null);

const moonAlt = (obs: Astronomy.Observer, d: Date) => {
  const eq = Astronomy.Equator(Astronomy.Body.Moon, d, obs, true, true);
  return Astronomy.Horizon(d, obs, eq.ra, eq.dec, "normal").altitude;
};

/** night = date du soir (YYYY-MM-DD, heure locale). Cible en J2000 (degrés). */
export function computeNight(
  site: ObservingSite,
  night: string,
  firstAt: string,
  lastAt: string,
  targetRa: number | null,
  targetDec: number | null,
): NightConditions {
  const obs = new Astronomy.Observer(Number(site.latitude), Number(site.longitude), Number(site.elevation) || 0);
  const noon = new Date(`${night}T12:00:00`);
  const dusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, noon, 1, -18);
  const dawn = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, +1, dusk?.date ?? noon, 1, -18);
  const rise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, +1, noon, 1);
  const set = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, -1, noon, 1);
  const first = new Date(firstAt);
  const last = new Date(lastAt);

  const from = dusk?.date ?? new Date(Math.min(first.getTime(), noon.getTime() + 6 * 3600e3));
  const to = dawn?.date ?? new Date(Math.max(last.getTime(), noon.getTime() + 18 * 3600e3));
  const curve: { t: number; alt: number }[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const d = new Date(from.getTime() + ((to.getTime() - from.getTime()) * i) / steps);
    curve.push({ t: d.getTime(), alt: moonAlt(obs, d) });
  }
  let maxAlt: number | null = null;
  const span = last.getTime() - first.getTime();
  for (let i = 0; i <= 12; i++) {
    const d = new Date(first.getTime() + (span * i) / 12);
    const a = moonAlt(obs, d);
    maxAlt = maxAlt === null ? a : Math.max(maxAlt, a);
  }
  let separation: number | null = null;
  if (targetRa !== null && targetDec !== null) {
    const mid = new Date(first.getTime() + span / 2);
    const m = Astronomy.Equator(Astronomy.Body.Moon, mid, obs, false, true); // J2000
    const r = Math.PI / 180;
    const cos =
      Math.sin(targetDec * r) * Math.sin(m.dec * r) +
      Math.cos(targetDec * r) * Math.cos(m.dec * r) * Math.cos((targetRa - m.ra * 15) * r);
    separation = Math.acos(Math.min(1, Math.max(-1, cos))) / r;
  }
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, new Date(first.getTime() + span / 2));
  return {
    duskAstro: dusk?.date ?? null,
    dawnAstro: dawn?.date ?? null,
    moonRise: rise?.date ?? null,
    moonSet: set?.date ?? null,
    illumination: Math.round(illum.phase_fraction * 100),
    moonAltMaxDuringAcq: maxAlt,
    separation,
    curve,
  };
}

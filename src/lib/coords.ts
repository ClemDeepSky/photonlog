// Conversion d'époque des coordonnées (JNow <-> J2000) par précession moyenne.
// La carte du ciel (Aladin) travaille en ICRS/J2000 : on stocke toujours du J2000.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Siècles juliens écoulés depuis J2000.0 pour une date donnée (défaut : maintenant). */
export function centuriesSinceJ2000(date: Date = new Date()): number {
  const JD2000 = 2451545.0;
  const jd = date.getTime() / 86400000 + 2440587.5;
  return (jd - JD2000) / 36525;
}

/** Angles de précession moyenne (rad) pour un intervalle T en siècles juliens depuis J2000. */
function precessionAngles(T: number) {
  const zeta = (0.6406161 * T + 0.0000839 * T * T + 0.000005 * T ** 3) * D2R;
  const z = (0.6406161 * T + 0.0003041 * T * T + 0.0000051 * T ** 3) * D2R;
  const theta = (0.556753 * T - 0.0001185 * T * T - 0.0000116 * T ** 3) * D2R;
  return { zeta, z, theta };
}

/** J2000 -> équinoxe moyen de la date (T siècles après J2000). */
export function precessJ2000ToDate(raDeg: number, decDeg: number, T: number) {
  const { zeta, z, theta } = precessionAngles(T);
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const A = Math.cos(dec) * Math.sin(ra + zeta);
  const B = Math.cos(theta) * Math.cos(dec) * Math.cos(ra + zeta) - Math.sin(theta) * Math.sin(dec);
  const C = Math.sin(theta) * Math.cos(dec) * Math.cos(ra + zeta) + Math.cos(theta) * Math.sin(dec);
  let ra2 = Math.atan2(A, B) + z;
  if (ra2 < 0) ra2 += 2 * Math.PI;
  return { ra: ra2 * R2D, dec: Math.asin(Math.max(-1, Math.min(1, C))) * R2D };
}

/** Équinoxe de la date -> J2000, par itération (les écarts sont faibles, convergence immédiate). */
export function precessDateToJ2000(raDeg: number, decDeg: number, T: number = centuriesSinceJ2000()) {
  let ra = raDeg;
  let dec = decDeg;
  for (let i = 0; i < 6; i++) {
    const f = precessJ2000ToDate(ra, dec, T);
    let dRa = raDeg - f.ra;
    if (dRa > 180) dRa -= 360;
    if (dRa < -180) dRa += 360;
    ra += dRa;
    dec += decDeg - f.dec;
  }
  return { ra: ((ra % 360) + 360) % 360, dec };
}

/** "0h 44m 20.8s" -> degrés. */
export function raHmsToDeg(h: string, m: string, s: string): number {
  return (parseFloat(h || "0") + parseFloat(m || "0") / 60 + parseFloat(s || "0") / 3600) * 15;
}

/** "40d 21m 46.5s" (signe sur les degrés) -> degrés. */
export function decDmsToDeg(d: string, m: string, s: string): number {
  const deg = parseFloat(d || "0");
  const sign = deg < 0 || d.trim().startsWith("-") ? -1 : 1;
  return sign * (Math.abs(deg) + parseFloat(m || "0") / 60 + parseFloat(s || "0") / 3600);
}

const fmt = (v: number, decimals = 1) => {
  const r = v.toFixed(decimals);
  return r.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
};

/** Degrés -> { h, m, s } pour l'ascension droite. */
export function degToRaHms(raDeg: number) {
  const totalHours = (((raDeg % 360) + 360) % 360) / 15;
  const h = Math.floor(totalHours);
  const m = Math.floor((totalHours - h) * 60);
  const s = (totalHours - h - m / 60) * 3600;
  return { h: String(h), m: String(m), s: fmt(s) };
}

/** Degrés -> { d, m, s } pour la déclinaison (signe sur les degrés). */
export function degToDecDms(decDeg: number) {
  const sign = decDeg < 0 ? "-" : "";
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = (abs - d - m / 60) * 3600;
  return { d: `${sign}${d}`, m: String(m), s: fmt(s) };
}

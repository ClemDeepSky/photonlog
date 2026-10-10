import { Input } from "@/components/ui/input";
import { raHmsToDeg, decDmsToDeg, degToRaHms, degToDecDms, precessDateToJ2000, precessJ2000ToDate, centuriesSinceJ2000 } from "@/lib/coords";

const num = (s: string) => s.replace(",", ".").replace(/[^\d.]/g, "");

export function parseRa(value: string) {
  const m = value.match(/(-?[\d.]+)\D+(-?[\d.]+)\D+(-?[\d.]+)/);
  return { h: m?.[1] ?? "", m: m?.[2] ?? "", s: m?.[3] ?? "" };
}
export function formatRa(h: string, m: string, s: string) {
  if (!h && !m && !s) return "";
  return `${h || 0}h ${m || 0}m ${s || 0}s`;
}
export function parseDec(value: string) {
  const m = value.match(/(-?[\d.]+)\D+(-?[\d.]+)\D+(-?[\d.]+)/);
  return { d: m?.[1] ?? "", m: m?.[2] ?? "", s: m?.[3] ?? "" };
}
export function formatDec(d: string, m: string, s: string) {
  if (!d && !m && !s) return "";
  return `${d || 0}d ${m || 0}m ${s || 0}s`;
}

const Cell = ({
  value,
  onChange,
  unit,
  width = "w-16",
  allowSign = false,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  width?: string;
  allowSign?: boolean;
}) => (
  <div className="relative">
    <Input
      aria-label={unit}
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(allowSign ? v.replace(",", ".").replace(/[^-\d.]/g, "") : num(v));
      }}
      className={`${width} h-8 pr-5 text-right font-mono text-sm`}
      placeholder="0"
    />
    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      {unit}
    </span>
  </div>
);

export type Epoch = "J2000" | "JNow";

type Props = {
  ra: string;
  dec: string;
  rotation: string;
  epoch?: Epoch;
  onCoordinatesChange?: (ra: string, dec: string) => void;
  onRaChange: (v: string) => void;
  onDecChange: (v: string) => void;
  onRotationChange: (v: string) => void;
};

export function coordinatesToJ2000(ra: string, dec: string, epoch: Epoch) {
  if (epoch === "J2000" || !ra || !dec) return { ra, dec };
  const r = parseRa(ra);
  const d = parseDec(dec);
  const converted = precessDateToJ2000(raHmsToDeg(r.h, r.m, r.s), decDmsToDeg(d.d, d.m, d.s));
  const cr = degToRaHms(converted.ra);
  const cd = degToDecDms(converted.dec);
  return { ra: formatRa(cr.h, cr.m, cr.s), dec: formatDec(cd.d, cd.m, cd.s) };
}

const CoordinateInputs = ({ ra, dec, rotation, onRaChange, onDecChange, onRotationChange, onCoordinatesChange, epoch = "J2000" }: Props) => {
  let displayRa = ra;
  let displayDec = dec;
  if (epoch === "JNow" && ra && dec) {
    const r = parseRa(ra);
    const d = parseDec(dec);
    const converted = precessJ2000ToDate(raHmsToDeg(r.h, r.m, r.s), decDmsToDeg(d.d, d.m, d.s), centuriesSinceJ2000());
    const cr = degToRaHms(converted.ra);
    const cd = degToDecDms(converted.dec);
    displayRa = formatRa(cr.h, cr.m, cr.s);
    displayDec = formatDec(cd.d, cd.m, cd.s);
  }
  const r = parseRa(displayRa);
  const d = parseDec(displayDec);

  // En mode JNow, la valeur saisie est convertie en J2000 avant d'être stockée.
  const commit = (nextRa: string, nextDec: string) => {
    const converted = coordinatesToJ2000(nextRa, nextDec, epoch);
    if (onCoordinatesChange) {
      onCoordinatesChange(converted.ra, converted.dec);
    } else {
      onRaChange(converted.ra);
      onDecChange(converted.dec);
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2 py-1">
        <span className="w-10 text-xs text-muted-foreground">RA</span>
        <Cell value={r.h} unit="h" onChange={(v) => commit(formatRa(v, r.m, r.s), displayDec)} />
        <Cell value={r.m} unit="m" onChange={(v) => commit(formatRa(r.h, v, r.s), displayDec)} />
        <Cell value={r.s} unit="s" width="w-20" onChange={(v) => commit(formatRa(r.h, r.m, v), displayDec)} />
      </div>
      <div className="flex items-center gap-2 py-1">
        <span className="w-10 text-xs text-muted-foreground">Dec</span>
        <Cell value={d.d} unit="d" allowSign onChange={(v) => commit(displayRa, formatDec(v, d.m, d.s))} />
        <Cell value={d.m} unit="m" onChange={(v) => commit(displayRa, formatDec(d.d, v, d.s))} />
        <Cell value={d.s} unit="s" width="w-20" onChange={(v) => commit(displayRa, formatDec(d.d, d.m, v))} />
      </div>
      <div className="flex items-center gap-2 py-1">
        <span className="w-10 text-xs text-muted-foreground">Angle</span>
        <Cell value={rotation} unit="°" width="w-20" allowSign onChange={onRotationChange} />
      </div>
    </div>
  );
};

export default CoordinateInputs;

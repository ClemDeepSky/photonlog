import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { raHmsToDeg, decDmsToDeg, degToRaHms, degToDecDms, precessDateToJ2000 } from "@/lib/coords";

const num = (s: string) => s.replace(/[^\d.]/g, "");

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
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(allowSign ? v.replace(/[^-\d.]/g, "") : num(v));
      }}
      className={`${width} h-8 pr-5 text-right font-mono text-sm`}
      placeholder="0"
    />
    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      {unit}
    </span>
  </div>
);

type Epoch = "J2000" | "JNow";

type Props = {
  ra: string;
  dec: string;
  rotation: string;
  onRaChange: (v: string) => void;
  onDecChange: (v: string) => void;
  onRotationChange: (v: string) => void;
};

const CoordinateInputs = ({ ra, dec, rotation, onRaChange, onDecChange, onRotationChange }: Props) => {
  const [epoch, setEpoch] = useState<Epoch>("J2000");
  const r = parseRa(ra);
  const d = parseDec(dec);

  // En mode JNow, la valeur saisie est convertie en J2000 avant d'être stockée.
  const commit = (nextRa: string, nextDec: string) => {
    if (epoch === "JNow") {
      const pr = parseRa(nextRa);
      const pd = parseDec(nextDec);
      const conv = precessDateToJ2000(raHmsToDeg(pr.h, pr.m, pr.s), decDmsToDeg(pd.d, pd.m, pd.s));
      const cr = degToRaHms(conv.ra);
      const cd = degToDecDms(conv.dec);
      onRaChange(formatRa(cr.h, cr.m, cr.s));
      onDecChange(formatDec(cd.d, cd.m, cd.s));
    } else {
      onRaChange(nextRa);
      onDecChange(nextDec);
    }
  };

  return (
    <div className="inline-block rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center gap-2 py-1">
        <span className="w-10 text-xs text-muted-foreground">RA</span>
        <Cell value={r.h} unit="h" onChange={(v) => commit(formatRa(v, r.m, r.s), dec)} />
        <Cell value={r.m} unit="m" onChange={(v) => commit(formatRa(r.h, v, r.s), dec)} />
        <Cell value={r.s} unit="s" width="w-20" onChange={(v) => commit(formatRa(r.h, r.m, v), dec)} />
      </div>
      <div className="flex items-center gap-2 py-1">
        <span className="w-10 text-xs text-muted-foreground">Dec</span>
        <Cell value={d.d} unit="d" allowSign onChange={(v) => commit(ra, formatDec(v, d.m, d.s))} />
        <Cell value={d.m} unit="m" onChange={(v) => commit(ra, formatDec(d.d, v, d.s))} />
        <Cell value={d.s} unit="s" width="w-20" onChange={(v) => commit(ra, formatDec(d.d, d.m, v))} />
        <span className="ml-2 text-xs text-muted-foreground">Rotation</span>
        <Cell value={rotation} unit="°" width="w-20" allowSign onChange={onRotationChange} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="w-10 text-xs text-muted-foreground">Époque</span>
        {(["J2000", "JNow"] as const).map((e) => (
          <Button
            key={e}
            type="button"
            size="sm"
            variant={epoch === e ? "default" : "outline"}
            className="h-6 px-2 text-xs"
            onClick={() => setEpoch(e)}
          >
            {e}
          </Button>
        ))}
        {epoch === "JNow" && (
          <span className="text-[10px] text-muted-foreground">converti en J2000 à l'enregistrement</span>
        )}
      </div>
    </div>
  );
};

export default CoordinateInputs;

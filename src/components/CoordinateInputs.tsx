import { Input } from "@/components/ui/input";

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

type Props = {
  ra: string;
  dec: string;
  rotation: string;
  onRaChange: (v: string) => void;
  onDecChange: (v: string) => void;
  onRotationChange: (v: string) => void;
};

const CoordinateInputs = ({ ra, dec, rotation, onRaChange, onDecChange, onRotationChange }: Props) => {
  const r = parseRa(ra);
  const d = parseDec(dec);

  return (
    <div className="inline-block rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center gap-2 py-1">
        <span className="w-10 text-xs text-muted-foreground">RA</span>
        <Cell value={r.h} unit="h" onChange={(v) => onRaChange(formatRa(v, r.m, r.s))} />
        <Cell value={r.m} unit="m" onChange={(v) => onRaChange(formatRa(r.h, v, r.s))} />
        <Cell value={r.s} unit="s" width="w-20" onChange={(v) => onRaChange(formatRa(r.h, r.m, v))} />
      </div>
      <div className="flex items-center gap-2 py-1">
        <span className="w-10 text-xs text-muted-foreground">Dec</span>
        <Cell value={d.d} unit="d" allowSign onChange={(v) => onDecChange(formatDec(v, d.m, d.s))} />
        <Cell value={d.m} unit="m" onChange={(v) => onDecChange(formatDec(d.d, v, d.s))} />
        <Cell value={d.s} unit="s" width="w-20" onChange={(v) => onDecChange(formatDec(d.d, d.m, v))} />
        <span className="ml-2 text-xs text-muted-foreground">Rotation</span>
        <Cell value={rotation} unit="°" width="w-20" allowSign onChange={onRotationChange} />
      </div>
    </div>
  );
};

export default CoordinateInputs;

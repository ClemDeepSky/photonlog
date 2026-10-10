const SAMPLE: Record<string, string> = {
  TARGETNAME: "M31", IMAGETYPE: "LIGHT", FILTER: "Ha", DATE: "2026-10-09", TIME: "22-14-05",
  DATETIME: "2026-10-09_22-14-05", SENSORTEMP: "-10.0", EXPOSURETIME: "300.00", FWHM: "2.85",
  ECCENTRICITY: "0.42", STARCOUNT: "1534", HFR: "1.92", FRAMENR: "0042", GAIN: "100", OFFSET: "50",
  BINNING: "1x1", CAMERA: "ASI2600MM", TELESCOPE: "FSQ85", PANE: "1", PANEL: "1", RMS: "0.55",
};
export default function FilenamePreview({ pattern }: { pattern: string }) {
  if (!pattern.trim()) return null;
  const text = pattern.replace(/\$\$([A-Z0-9_]+)\$\$/gi, (_, k: string) => SAMPLE[k.toUpperCase()] ?? k.toLowerCase());
  return (
    <p className="text-xs mt-1 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono break-all">
      <span className="text-muted-foreground font-sans mr-2">Aperçu :</span>{text}.fits
    </p>
  );
}

import { describe, expect, it } from "vitest";
import { buildProjectSummary, formatIntegration, type SummaryPlanLine } from "./projectSummary";

// Cas de cohérence : M31, mosaïque de 2 panneaux, objectifs déjà globaux.
const m31: SummaryPlanLine[] = [
  { id: "oiii", filter: "OIII", exposure_duration: 600, quantity: 275, acquired: 0 },
  { id: "ha", filter: "Ha", exposure_duration: 600, quantity: 275, acquired: 0 },
  { id: "l", filter: "L", exposure_duration: 300, quantity: 75, acquired: 0 },
  { id: "r", filter: "R", exposure_duration: 300, quantity: 75, acquired: 0 },
  { id: "v", filter: "V", exposure_duration: 300, quantity: 75, acquired: 0 },
  { id: "b", filter: "B", exposure_duration: 300, quantity: 75, acquired: 0 },
];

const plain = (paragraphs: { text: string }[][]) =>
  paragraphs.map((p) => p.map((s) => s.text).join("")).join("\n\n");

describe("project summary", () => {
  it("formats integration durations in hours and minutes", () => {
    expect(formatIntegration(275 * 600)).toBe("45 h 50 min");
    expect(formatIntegration(75 * 300)).toBe("6 h 15 min");
    expect(formatIntegration(420000)).toBe("116 h 40 min");
    expect(formatIntegration(90)).toBe("1 min 30 s");
  });

  it("keeps global objectives untouched by the panel count", () => {
    const summary = buildProjectSummary({
      target: "M31",
      isMosaic: true,
      paneCount: 2,
      lines: m31,
      progressPercent: 0,
    });
    const text = plain(summary.paragraphs);
    expect(text).toContain("mosaïque composée de 2 panneaux");
    expect(text).toContain("850 brutes");
    expect(text).toContain("116 h 40 min");
    expect(text).toContain("45 h 50 min");
    expect(text).toContain("6 h 15 min");
    expect(text).toContain("Les acquisitions n'ont pas encore commencé.");
    expect(text).not.toMatch(/undefined|null|NaN/);
  });

  it("sums per-panel lines once and reports progress from the application value", () => {
    const perPane: SummaryPlanLine[] = m31.flatMap((line) => [
      { ...line, id: `${line.id}-1`, pane_id: "p1", acquired: 10 },
      { ...line, id: `${line.id}-2`, pane_id: "p2", acquired: 5 },
    ]);
    const summary = buildProjectSummary({
      target: "M31",
      isMosaic: true,
      paneCount: 2,
      lines: perPane,
      fwhmByFilter: [{ filter: "OIII", avg: 2.5 }],
      progressPercent: 42,
    });
    const text = plain(summary.paragraphs);
    expect(text).toMatch(/1[\s\u202f]700 brutes/);
    expect(text).toContain("42 %");
    expect(text).toContain("La FWHM moyenne est de 2,5.");
    expect(text).toContain("2 h 30 min sur un objectif de 91 h 40 min");
  });

  it("adapts the wording to a single filter and to a missing FWHM", () => {
    const summary = buildProjectSummary({
      target: "NGC 7000",
      isMosaic: false,
      paneCount: 1,
      lines: [{ id: "h", filter: "Ha", exposure_duration: 600, quantity: 40, acquired: 40 }],
      fwhmByFilter: [{ filter: "Ha", avg: 0 }],
      progressPercent: 100,
    });
    const text = plain(summary.paragraphs);
    expect(text).toContain("repose sur un cadrage unique");
    expect(text).toContain("Il prévoit des acquisitions en Ha");
    expect(text).toContain("Les acquisitions prévues sont terminées.");
    expect(text).not.toContain("FWHM");
    expect(text).not.toContain("undefined");
  });

  it("flags an exceeded layer and omits sentences without data", () => {
    const summary = buildProjectSummary({
      target: "M42",
      isMosaic: false,
      paneCount: null,
      lines: [
        { id: "l", filter: "L", exposure_duration: 300, quantity: 10, acquired: 14 },
        { id: "x", filter: "SII", exposure_duration: 0, quantity: 0, acquired: 0 },
      ],
      progressPercent: 100,
    });
    const text = plain(summary.paragraphs);
    expect(text).toContain("L'objectif de cette couche est dépassé.");
    expect(text).toContain("14 brutes sur les 10 prévues");
    expect(text).not.toContain("SII");
    expect(text).not.toMatch(/undefined|null|NaN/);
  });

  it("uses the recorded durations when a filter mixes several exposures", () => {
    const summary = buildProjectSummary({
      target: "Sh2-91",
      isMosaic: false,
      paneCount: null,
      lines: [
        { id: "a", filter: "L", exposure_duration: 180, quantity: 50, acquired: 20 },
        { id: "b", filter: "L", exposure_duration: 600, quantity: 20, acquired: 5 },
      ],
      progressPercent: 30,
    });
    const text = plain(summary.paragraphs);
    expect(text).not.toContain("poses unitaires");
    expect(text).toContain("25 brutes");
    expect(text).toContain("1 h 50 min de pose");
  });
});

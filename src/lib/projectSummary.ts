// Résumé rédigé d'un projet, généré à partir des seules données déjà enregistrées.
// Générateur déterministe : formulations conditionnelles, aucun appel externe.
// Il ne modifie ni le modèle de données ni les règles de calcul de l'application.

import { filterBand } from "@/lib/filterBands";
import { planLineTargetSeconds, type PlanLine } from "@/lib/progress";

export type SummarySegment = { text: string; strong?: boolean };
export type SummaryParagraph = SummarySegment[];

export interface ProjectSummary {
  paragraphs: SummaryParagraph[];
  /** Texte brut, sans titre ni éléments d'interface (pour la copie). */
  text: string;
}

export interface SummaryPlanLine {
  id?: string;
  filter: string;
  exposure_duration?: number | null;
  quantity?: number | null;
  acquired?: number | null;
  target_seconds?: number | null;
  pane_id?: string | null;
}

export interface SummaryFwhm {
  filter: string;
  avg: number;
}

export interface SummaryInput {
  target: string;
  isMosaic: boolean;
  paneCount: number | null;
  lines: SummaryPlanLine[];
  fwhmByFilter?: SummaryFwhm[];
  /** Progression globale telle que l'application la calcule déjà. */
  progressPercent: number;
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const txt = (text: string): SummarySegment => ({ text });
const bold = (text: string): SummarySegment => ({ text, strong: true });

const count = (n: number) => Math.round(num(n)).toLocaleString("fr-FR");
const plural = (n: number, word: string) => `${count(n)} ${word}${Math.round(num(n)) > 1 ? "s" : ""}`;

/** Durée d'intégration : « 116 h 40 min », « 6 h 15 min », « 45 min », « 30 s ». */
export const formatIntegration = (seconds: number): string => {
  const s = Math.max(0, Math.round(num(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0) return sec > 0 ? `${m} min ${sec} s` : `${m} min`;
  return `${sec} s`;
};

/** Durée unitaire d'une pose, toujours exprimée en secondes. */
export const formatSeconds = (seconds: number) => plural(seconds, "seconde");

/** FWHM : au plus deux décimales, virgule française, zéro et négatif écartés. */
export const formatDecimal = (v: number): string | null => {
  const n = num(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
    .replace(".", ",");
};

const listFilters = (filters: string[]) =>
  filters.length < 2
    ? filters[0]
    : `${filters.slice(0, -1).join(", ")} et ${filters[filters.length - 1]}`;

interface FilterAggregate {
  filter: string;
  plannedSubs: number;
  acquiredSubs: number;
  plannedSeconds: number;
  acquiredSeconds: number;
  /** Durées de pose réellement enregistrées pour ce filtre. */
  durations: number[];
}

// Les lignes de plan portent déjà la somme des panneaux quand elles sont
// enregistrées par panneau : on additionne les lignes, sans jamais multiplier
// une nouvelle fois par le nombre de panneaux.
const aggregateByFilter = (lines: SummaryPlanLine[]): FilterAggregate[] => {
  const map = new Map<string, FilterAggregate>();
  for (const line of lines ?? []) {
    const filter = (line.filter ?? "").trim();
    if (!filter) continue;
    const agg =
      map.get(filter) ??
      { filter, plannedSubs: 0, acquiredSubs: 0, plannedSeconds: 0, acquiredSeconds: 0, durations: [] };
    const exposure = num(line.exposure_duration);
    const quantity = num(line.quantity);
    const acquired = num(line.acquired);
    const planLine: PlanLine = {
      id: line.id ?? "",
      filter,
      exposure_duration: exposure,
      quantity,
      target_seconds: line.target_seconds ?? null,
      pane_id: line.pane_id ?? null,
    };
    agg.plannedSubs += quantity;
    agg.acquiredSubs += acquired;
    agg.plannedSeconds += planLineTargetSeconds(planLine);
    agg.acquiredSeconds += acquired * exposure;
    if (exposure > 0 && !agg.durations.includes(exposure)) agg.durations.push(exposure);
    map.set(filter, agg);
  }
  return [...map.values()]
    // Une ligne sans aucune donnée (ni objectif, ni brute) est ignorée : jamais
    // de zéro inventé, et le filtre n'apparaît ni dans la liste ni en détail.
    .filter(
      (a) => a.plannedSubs > 0 || a.plannedSeconds > 0 || a.acquiredSubs > 0 || a.acquiredSeconds > 0,
    )
    .sort(
      (a, b) => filterBand(a.filter).order - filterBand(b.filter).order || a.filter.localeCompare(b.filter),
    );

};

export function buildProjectSummary(input: SummaryInput): ProjectSummary {
  const target = (input.target ?? "").trim();
  const aggregates = aggregateByFilter(input.lines ?? []);
  const fwhm = new Map<string, number>(
    (input.fwhmByFilter ?? [])
      .filter((f) => f && num(f.avg) > 0)
      .map((f) => [f.filter, num(f.avg)]),
  );

  const plannedSubs = aggregates.reduce((s, a) => s + a.plannedSubs, 0);
  const plannedSeconds = aggregates.reduce((s, a) => s + a.plannedSeconds, 0);
  const acquiredSubs = aggregates.reduce((s, a) => s + a.acquiredSubs, 0);
  const acquiredSeconds = aggregates.reduce((s, a) => s + a.acquiredSeconds, 0);
  const paneCount = num(input.paneCount);

  const paragraphs: SummaryParagraph[] = [];

  // 1. Présentation et objectifs.
  const intro: SummaryParagraph = [];
  if (target) intro.push(txt("Le projet "), bold(target));
  else intro.push(txt("Ce projet"));
  if (input.isMosaic) {
    intro.push(txt(" est une mosaïque"));
    if (paneCount > 0) intro.push(txt(" composée de "), bold(`${count(paneCount)} panneau${paneCount > 1 ? "s" : ""}`));
    intro.push(txt("."));
  } else {
    intro.push(txt(" repose sur un cadrage unique."));
  }
  if (aggregates.length > 0) {
    intro.push(
      txt(aggregates.length > 1 ? " Il associe des acquisitions en " : " Il prévoit des acquisitions en "),
      bold(listFilters(aggregates.map((a) => a.filter))),
    );
    if (plannedSubs > 0 && plannedSeconds > 0) {
      intro.push(txt(", pour un objectif de "), bold(plural(plannedSubs, "brute")), txt(", soit "), bold(formatIntegration(plannedSeconds)), txt(" d'intégration."));
    } else if (plannedSubs > 0) {
      intro.push(txt(", pour un objectif de "), bold(plural(plannedSubs, "brute")), txt("."));
    } else if (plannedSeconds > 0) {
      intro.push(txt(", pour un objectif de "), bold(formatIntegration(plannedSeconds)), txt(" d'intégration."));
    } else {
      intro.push(txt("."));
    }
  } else {
    intro.push(txt(" Les objectifs d'acquisition ne sont pas encore définis."));
  }
  paragraphs.push(intro);

  // 2. Avancement global — la progression est celle fournie par l'application.
  const progress = num(input.progressPercent);
  if (acquiredSubs > 0 || acquiredSeconds > 0) {
    const p: SummaryParagraph = [txt("À ce jour, ")];
    if (acquiredSubs > 0) p.push(bold(plural(acquiredSubs, "brute")), txt(" ont été acquises"));
    else p.push(txt("des poses ont été acquises"));
    if (acquiredSeconds > 0) p.push(txt(", représentant "), bold(formatIntegration(acquiredSeconds)), txt(" de pose"));
    p.push(txt(". "));
    if (progress >= 100) p.push(txt("Les acquisitions prévues sont terminées."));
    else if (progress > 0) p.push(txt("La progression globale atteint "), bold(`${Math.round(progress)} %`), txt("."));
    paragraphs.push(p);
  } else {
    paragraphs.push([txt("Les acquisitions n'ont pas encore commencé.")]);
  }

  // 3. Détail par filtre, dans l'ordre déjà utilisé dans l'application.
  for (const agg of aggregates) {
    const uniform = agg.durations.length === 1 ? agg.durations[0] : null;
    const fwhmAvg = formatDecimal(fwhm.get(agg.filter) ?? 0);
    const p: SummaryParagraph = [txt("En "), bold(agg.filter), txt(", ")];

    if (agg.acquiredSubs > 0) {
      p.push(bold(plural(agg.acquiredSubs, "brute")));
      if (agg.plannedSubs > 0) p.push(txt(" sur les "), bold(count(agg.plannedSubs)), txt(" prévues"));
      p.push(txt(" ont été acquises"));
      // Pas de durée unitaire lorsqu'un filtre mélange plusieurs durées de pose.
      if (uniform) p.push(txt(", avec des poses unitaires de "), bold(formatSeconds(uniform)));
      p.push(txt("."));
      if (agg.acquiredSeconds > 0 && agg.plannedSeconds > 0) {
        p.push(txt(" Cette couche totalise "), bold(formatIntegration(agg.acquiredSeconds)), txt(" sur un objectif de "), bold(formatIntegration(agg.plannedSeconds)), txt("."));
      } else if (agg.acquiredSeconds > 0) {
        p.push(txt(" Cette couche totalise "), bold(formatIntegration(agg.acquiredSeconds)), txt("."));
      }
      if (fwhmAvg) p.push(txt(" La FWHM moyenne est de "), bold(fwhmAvg), txt("."));
      if (agg.plannedSubs > 0 && agg.acquiredSubs > agg.plannedSubs) {
        p.push(txt(" L'objectif de cette couche est dépassé."));
      }
      paragraphs.push(p);
    } else if (agg.plannedSubs > 0 || agg.plannedSeconds > 0) {
      p.push(txt("l'objectif est de "));
      if (agg.plannedSubs > 0 && uniform) {
        p.push(bold(plural(agg.plannedSubs, "pose")), txt(" de "), bold(formatSeconds(uniform)));
      } else if (agg.plannedSubs > 0) {
        p.push(bold(plural(agg.plannedSubs, "pose")));
      } else {
        p.push(bold(formatIntegration(agg.plannedSeconds)), txt(" d'intégration"));
      }
      if (agg.plannedSeconds > 0 && agg.plannedSubs > 0) {
        p.push(txt(", soit "), bold(formatIntegration(agg.plannedSeconds)), txt(" d'intégration"));
      }
      p.push(txt(". Les acquisitions de cette couche n'ont pas encore commencé."));
      paragraphs.push(p);
    }
    // Aucune donnée pour ce filtre : paragraphe omis, jamais de zéro inventé.
  }

  const text = paragraphs.map((p) => p.map((s) => s.text).join("")).join("\n\n");
  return { paragraphs, text };
}

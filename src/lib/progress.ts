// Moteur de progression unique de Photonlog V2.
//
// Toute la progression (personnelle ou d'équipe, manuelle ou automatique) se
// calcule à partir de deux entrées normalisées :
//   - le PLAN d'acquisition (ce qu'on veut acquérir) ;
//   - les LOTS DE POSES réalisés (ce qui a été acquis).
// Unité principale : le temps d'intégration. Le nombre de poses reste
// disponible comme information secondaire.

export interface PlanLine {
  id: string;
  filter: string;
  exposure_duration: number;
  quantity: number;
  target_seconds?: number | null;
  pane_id?: string | null;
  acquired?: number;
}

export interface AcquiredBatch {
  filter: string;
  exposure_duration: number;
  sub_count: number;
  pane_id?: string | null;
}

export interface FilterProgress {
  filter: string;
  acquiredSeconds: number;
  targetSeconds: number;
  acquiredSubs: number;
  targetSubs: number;
  percent: number;
}

export interface ProgressResult {
  acquiredSeconds: number;
  targetSeconds: number;
  remainingSeconds: number;
  acquiredSubs: number;
  targetSubs: number;
  percent: number;
  averageExposure: number;
  byFilter: FilterProgress[];
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return isNaN(n) ? 0 : n;
};

/** Objectif d'une ligne de plan, en secondes. */
export const planLineTargetSeconds = (line: PlanLine): number =>
  line.target_seconds != null && num(line.target_seconds) > 0
    ? num(line.target_seconds)
    : num(line.quantity) * num(line.exposure_duration);

/** Temps d'intégration d'un lot de poses, en secondes. */
export const batchSeconds = (batch: AcquiredBatch): number =>
  num(batch.sub_count) * num(batch.exposure_duration);

/**
 * Projets encore suivis par le compteur V1 (`acquired`) : on en déduit des lots
 * équivalents pour que la V2 affiche la même progression sans rien migrer.
 */
export const batchesFromPlanCounters = (plan: PlanLine[]): AcquiredBatch[] =>
  plan.map((line) => ({
    filter: line.filter,
    exposure_duration: num(line.exposure_duration),
    sub_count: num(line.acquired),
    pane_id: line.pane_id ?? null,
  }));

const pct = (done: number, target: number) =>
  target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;

export function computeProgress(plan: PlanLine[], batches: AcquiredBatch[]): ProgressResult {
  const targets = new Map<string, { seconds: number; subs: number }>();
  for (const line of plan) {
    const entry = targets.get(line.filter) || { seconds: 0, subs: 0 };
    entry.seconds += planLineTargetSeconds(line);
    entry.subs += num(line.quantity);
    targets.set(line.filter, entry);
  }

  const acquired = new Map<string, { seconds: number; subs: number }>();
  for (const batch of batches) {
    const entry = acquired.get(batch.filter) || { seconds: 0, subs: 0 };
    entry.seconds += batchSeconds(batch);
    entry.subs += num(batch.sub_count);
    acquired.set(batch.filter, entry);
  }

  const filters = Array.from(new Set([...targets.keys(), ...acquired.keys()]));
  const byFilter: FilterProgress[] = filters
    .map((filter) => {
      const t = targets.get(filter) || { seconds: 0, subs: 0 };
      const a = acquired.get(filter) || { seconds: 0, subs: 0 };
      return {
        filter,
        acquiredSeconds: a.seconds,
        targetSeconds: t.seconds,
        acquiredSubs: a.subs,
        targetSubs: t.subs,
        percent: pct(a.seconds, t.seconds),
      };
    })
    .sort((a, b) => b.targetSeconds - a.targetSeconds || b.acquiredSeconds - a.acquiredSeconds);

  const acquiredSeconds = byFilter.reduce((s, f) => s + f.acquiredSeconds, 0);
  const targetSeconds = byFilter.reduce((s, f) => s + f.targetSeconds, 0);
  const acquiredSubs = byFilter.reduce((s, f) => s + f.acquiredSubs, 0);
  const targetSubs = byFilter.reduce((s, f) => s + f.targetSubs, 0);

  return {
    acquiredSeconds,
    targetSeconds,
    remainingSeconds: Math.max(0, targetSeconds - acquiredSeconds),
    acquiredSubs,
    targetSubs,
    percent: pct(acquiredSeconds, targetSeconds),
    averageExposure: acquiredSubs > 0 ? Math.round(acquiredSeconds / acquiredSubs) : 0,
    byFilter,
  };
}

export const filterColors: Record<string, string> = {
  L: "hsl(var(--foreground))",
  R: "hsl(0, 72%, 55%)",
  G: "hsl(142, 71%, 45%)",
  B: "hsl(217, 91%, 60%)",
  Ha: "hsl(0, 85%, 60%)",
  OIII: "hsl(192, 91%, 54%)",
  SII: "hsl(35, 92%, 55%)",
};

export const colorForFilter = (filter: string) =>
  filterColors[filter] || "hsl(var(--muted-foreground))";

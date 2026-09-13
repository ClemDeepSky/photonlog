// Modèle V2 : contributions, sessions et lots de poses.
// Les brutes indexées restent dans project_frames ; on les rattache à une session.

import { supabase } from "@/integrations/supabase/client";
import type { AcquiredBatch } from "@/lib/progress";

export type TrackingMode = "manual" | "automatic";

export interface Contribution {
  id: string;
  project_id: string;
  user_id: string;
  tracking_mode: TrackingMode;
  setup: string | null;
  folder_path: string | null;
  filename_pattern: string | null;
}

export interface SessionBatch extends AcquiredBatch {
  id: string;
  session_id: string;
  bin: number;
  source: string;
}

export interface Session {
  id: string;
  project_id: string;
  contribution_id: string | null;
  created_by: string;
  source: "manual" | "automatic";
  started_at: string | null;
  ended_at: string | null;
  note: string | null;
  session_batches: SessionBatch[];
}

/** Une nuit = la date du soir : avant midi, on rattache au jour précédent. */
export const nightKey = (iso: string): string => {
  const d = new Date(iso);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export const formatNightRange = (start: string | null, end: string | null): string => {
  if (!start) return "Date indéterminée";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const day = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const withYear = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  if (!e || s.toDateString() === e.toDateString()) return withYear(s);
  return `${day(s)} → ${withYear(e)}`;
};

/** Récupère (ou crée) la contribution de l'utilisateur courant sur un projet. */
export async function ensureContribution(
  projectId: string,
  userId: string,
  defaults?: Partial<Contribution>
): Promise<Contribution> {
  const { data: existing, error } = await supabase
    .from("project_contributions")
    .select("id, project_id, user_id, tracking_mode, setup, folder_path, filename_pattern")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as Contribution;

  const { data, error: insertError } = await supabase
    .from("project_contributions")
    .insert({
      project_id: projectId,
      user_id: userId,
      tracking_mode: defaults?.tracking_mode ?? "manual",
      setup: defaults?.setup ?? null,
      folder_path: defaults?.folder_path ?? null,
      filename_pattern: defaults?.filename_pattern ?? null,
    })
    .select("id, project_id, user_id, tracking_mode, setup, folder_path, filename_pattern")
    .single();
  if (insertError) throw insertError;
  return data as Contribution;
}

export async function fetchSessions(projectId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("project_sessions")
    .select(
      "id, project_id, contribution_id, created_by, source, started_at, ended_at, note, session_batches(id, session_id, filter, exposure_duration, sub_count, bin, source, pane_id)"
    )
    .eq("project_id", projectId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Session[];
}

export const sessionSeconds = (session: Session): number =>
  (session.session_batches || []).reduce(
    (s, b) => s + Number(b.sub_count || 0) * Number(b.exposure_duration || 0),
    0
  );

export const sessionSubs = (session: Session): number =>
  (session.session_batches || []).reduce((s, b) => s + Number(b.sub_count || 0), 0);

export const sessionFilters = (session: Session): string[] =>
  Array.from(new Set((session.session_batches || []).map((b) => b.filter))).sort();

export const batchesOf = (sessions: Session[]): AcquiredBatch[] =>
  sessions.flatMap((s) => s.session_batches || []);

/**
 * Reconstruit les sessions automatiques d'une contribution à partir des brutes
 * déjà indexées. Les sessions manuelles ne sont jamais touchées ; aucune brute
 * n'est supprimée.
 */
export async function rebuildAutomaticSessions(
  projectId: string,
  contributionId: string
): Promise<{ sessions: number; subs: number }> {
  const frames: {
    id: string;
    filter: string | null;
    captured_at: string | null;
    exposure_duration: number | null;
    pane_number: number | null;
  }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("project_frames")
      .select("id, filter, captured_at, exposure_duration, pane_number")
      .eq("project_id", projectId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    frames.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }

  // On repart de zéro pour les sessions automatiques de cette contribution :
  // elles sont entièrement dérivées des fichiers.
  const { data: oldAuto, error: oldError } = await supabase
    .from("project_sessions")
    .select("id")
    .eq("project_id", projectId)
    .eq("contribution_id", contributionId)
    .eq("source", "automatic");
  if (oldError) throw oldError;
  if (oldAuto?.length) {
    const { error } = await supabase
      .from("project_sessions")
      .delete()
      .in("id", oldAuto.map((s) => s.id));
    if (error) throw error;
  }

  const nights = new Map<
    string,
    { frameIds: string[]; times: number[]; batches: Map<string, { filter: string; exposure: number; count: number }> }
  >();

  for (const frame of frames) {
    const key = frame.captured_at ? nightKey(frame.captured_at) : "unknown";
    const night =
      nights.get(key) || { frameIds: [], times: [], batches: new Map() };
    night.frameIds.push(frame.id);
    if (frame.captured_at) night.times.push(new Date(frame.captured_at).getTime());
    const filter = frame.filter || "—";
    const exposure = Number(frame.exposure_duration || 0);
    const bKey = `${filter}|${exposure}`;
    const batch = night.batches.get(bKey) || { filter, exposure, count: 0 };
    batch.count += 1;
    night.batches.set(bKey, batch);
    nights.set(key, night);
  }

  let subs = 0;
  for (const [, night] of nights) {
    const started = night.times.length ? new Date(Math.min(...night.times)).toISOString() : null;
    const ended = night.times.length ? new Date(Math.max(...night.times)).toISOString() : null;

    const { data: session, error } = await supabase
      .from("project_sessions")
      .insert({
        project_id: projectId,
        contribution_id: contributionId,
        source: "automatic",
        started_at: started,
        ended_at: ended,
      })
      .select("id")
      .single();
    if (error) throw error;

    const rows = Array.from(night.batches.values()).map((b) => ({
      session_id: session.id,
      project_id: projectId,
      filter: b.filter,
      exposure_duration: b.exposure,
      sub_count: b.count,
      source: "automatic",
    }));
    subs += rows.reduce((s, r) => s + r.sub_count, 0);
    if (rows.length) {
      const { error: batchError } = await supabase.from("session_batches").insert(rows);
      if (batchError) throw batchError;
    }

    for (let i = 0; i < night.frameIds.length; i += 400) {
      const { error: linkError } = await supabase
        .from("project_frames")
        .update({ session_id: session.id })
        .in("id", night.frameIds.slice(i, i + 400));
      if (linkError) throw linkError;
    }
  }

  return { sessions: nights.size, subs };
}

/**
 * Bascule un projet existant dans le modèle V2 sans rien détruire :
 * une contribution pour son propriétaire, puis les sessions.
 * En mode manuel, le compteur V1 devient une session « historique ».
 */
export async function convertProjectToV2(
  project: {
    id: string;
    created_by: string;
    setup: string | null;
    folder_path: string | null;
    filename_pattern: string | null;
  },
  mode: TrackingMode
): Promise<void> {
  const contribution = await ensureContribution(project.id, project.created_by, {
    tracking_mode: mode,
    setup: project.setup,
    folder_path: project.folder_path,
    filename_pattern: project.filename_pattern,
  });

  await supabase
    .from("project_contributions")
    .update({
      tracking_mode: mode,
      setup: project.setup,
      folder_path: project.folder_path,
      filename_pattern: project.filename_pattern,
    })
    .eq("id", contribution.id);

  if (mode === "automatic") {
    await rebuildAutomaticSessions(project.id, contribution.id);
  } else {
    const { data: existing } = await supabase
      .from("project_sessions")
      .select("id")
      .eq("project_id", project.id)
      .limit(1);
    if (!existing?.length) {
      const { data: plan } = await supabase
        .from("project_acquisitions")
        .select("id, filter, exposure_duration, acquired, bin, pane_id")
        .eq("project_id", project.id);
      const done = (plan || []).filter((p) => Number(p.acquired || 0) > 0);
      if (done.length) {
        const { data: session, error } = await supabase
          .from("project_sessions")
          .insert({
            project_id: project.id,
            contribution_id: contribution.id,
            source: "manual",
            started_at: null,
            ended_at: null,
            note: "Historique repris du suivi précédent",
          })
          .select("id")
          .single();
        if (error) throw error;
        await supabase.from("session_batches").insert(
          done.map((p) => ({
            session_id: session.id,
            project_id: project.id,
            acquisition_id: p.id,
            pane_id: p.pane_id,
            filter: p.filter,
            exposure_duration: p.exposure_duration,
            sub_count: p.acquired,
            bin: p.bin,
            source: "manual",
          }))
        );
      }
    }
  }

  const { error } = await supabase
    .from("projects")
    .update({ schema_version: 2, tracking_mode: mode })
    .eq("id", project.id);
  if (error) throw error;
}

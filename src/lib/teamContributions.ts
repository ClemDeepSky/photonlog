// Contributions des membres d'un projet Team : setup, plan personnel, dossier.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamContribution {
  id: string;
  project_id: string;
  user_id: string;
  tracking_mode: string;
  setup: string | null;
  equipment_profile_id: string | null;
  folder_path: string | null;
  filename_pattern: string | null;
  focal_length: number | null;
  sensor_width_mm: number | null;
  sensor_height_mm: number | null;
  username: string;
  color: string;
}

const COLORS = ["hsl(45 95% 60%)", "hsl(320 80% 65%)", "hsl(150 70% 50%)", "hsl(25 90% 60%)", "hsl(200 90% 65%)", "hsl(275 75% 70%)"];
export const contributionColor = (index: number) => COLORS[index % COLORS.length];

export const useProjectContributions = (projectId: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: ["team-contributions", projectId],
    enabled: !!projectId && enabled,
    queryFn: async (): Promise<TeamContribution[]> => {
      const { data, error } = await supabase
        .from("project_contributions")
        .select("id, project_id, user_id, tracking_mode, setup, equipment_profile_id, folder_path, filename_pattern, focal_length, sensor_width_mm, sensor_height_mm, created_at")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = Array.from(new Set((data || []).map((c) => c.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, username").in("id", ids)
        : { data: [] as { id: string; username: string }[] };
      const names = new Map((profiles || []).map((p) => [p.id, p.username]));
      return (data || []).map((c, i) => ({
        ...(c as any),
        focal_length: c.focal_length != null ? Number(c.focal_length) : null,
        sensor_width_mm: c.sensor_width_mm != null ? Number(c.sensor_width_mm) : null,
        sensor_height_mm: c.sensor_height_mm != null ? Number(c.sensor_height_mm) : null,
        username: names.get(c.user_id) || "Membre",
        color: contributionColor(i),
      }));
    },
  });

/** L'utilisateur peut-il modifier la contribution ? Lui-même, ou l'admin unique de la team. */
export const canEditContribution = (
  c: Pick<TeamContribution, "user_id">,
  userId: string | undefined,
  team: { owner_id: string; management_mode: string } | null | undefined,
) => !!userId && (c.user_id === userId || (team?.management_mode === "single_admin" && team.owner_id === userId));

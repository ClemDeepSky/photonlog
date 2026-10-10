import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FrameRow {
  id: string;
  acquisition_id: string | null;
  filter: string | null;
  exposure_duration: number | null;
  pane_number: number | null;
  captured_at: string | null;
  fwhm: number | null;
  eccentricity: number | null;
  hfr: number | null;
  star_count: number | null;
  sensor_temp: number | null;
  file_name: string | null;
  relative_path: string | null;
  contribution_id: string | null;
}

export function useProjectFrames(projectId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project-frames", projectId, user?.id],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      if (!projectId) return [];
      const all: FrameRow[] = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error } = await supabase.from("project_frames")
          .select("id, acquisition_id, filter, exposure_duration, pane_number, captured_at, fwhm, eccentricity, hfr, star_count, sensor_temp, file_name, relative_path, contribution_id")
          .eq("project_id", projectId).order("captured_at").order("id")
          .range(from, from + page - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < page) break;
      }
      return all;
    },
  });
}
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS filename_pattern text;

CREATE TABLE public.project_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  acquisition_id uuid REFERENCES public.project_acquisitions(id) ON DELETE SET NULL,
  relative_path text NOT NULL,
  file_name text NOT NULL,
  filter text,
  pane_number integer,
  captured_at timestamptz,
  exposure_duration numeric,
  fwhm numeric,
  eccentricity numeric,
  hfr numeric,
  star_count integer,
  sensor_temp numeric,
  frame_nr integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, relative_path)
);

CREATE INDEX project_frames_project_captured_idx ON public.project_frames (project_id, captured_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_frames TO authenticated;
GRANT ALL ON public.project_frames TO service_role;

ALTER TABLE public.project_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view frames" ON public.project_frames FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_frames.project_id AND (((p.team_id IS NOT NULL) AND is_team_member(p.team_id)) OR ((p.team_id IS NULL) AND (p.created_by = auth.uid())))));

CREATE POLICY "Users can create frames" ON public.project_frames FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_frames.project_id AND (((p.team_id IS NOT NULL) AND is_team_admin(p.team_id)) OR ((p.team_id IS NULL) AND (p.created_by = auth.uid())))));

CREATE POLICY "Users can update frames" ON public.project_frames FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_frames.project_id AND (((p.team_id IS NOT NULL) AND is_team_admin(p.team_id)) OR ((p.team_id IS NULL) AND (p.created_by = auth.uid())))));

CREATE POLICY "Users can delete frames" ON public.project_frames FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_frames.project_id AND (((p.team_id IS NOT NULL) AND is_team_admin(p.team_id)) OR ((p.team_id IS NULL) AND (p.created_by = auth.uid())))));
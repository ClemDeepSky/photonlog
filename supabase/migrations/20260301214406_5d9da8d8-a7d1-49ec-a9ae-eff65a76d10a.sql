
-- Add setup column to projects
ALTER TABLE public.projects ADD COLUMN setup text DEFAULT null;
ALTER TABLE public.projects ADD COLUMN is_mosaic boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN ra text DEFAULT null;
ALTER TABLE public.projects ADD COLUMN dec text DEFAULT null;
ALTER TABLE public.projects ADD COLUMN position_angle numeric DEFAULT null;

-- Create project_panes table for mosaic projects
CREATE TABLE public.project_panes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pane_number integer NOT NULL,
  ra text NOT NULL,
  dec text NOT NULL,
  position_angle numeric,
  pane_width numeric,
  pane_height numeric,
  overlap numeric,
  row_index integer,
  col_index integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_panes ENABLE ROW LEVEL SECURITY;

-- RLS: team members can view panes through project membership
CREATE POLICY "Team members can view panes"
  ON public.project_panes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_panes.project_id AND is_team_member(p.team_id)
  ));

CREATE POLICY "Team admin can create panes"
  ON public.project_panes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_panes.project_id AND is_team_admin(p.team_id)
  ));

CREATE POLICY "Team admin can update panes"
  ON public.project_panes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_panes.project_id AND is_team_admin(p.team_id)
  ));

CREATE POLICY "Team admin can delete panes"
  ON public.project_panes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_panes.project_id AND is_team_admin(p.team_id)
  ));

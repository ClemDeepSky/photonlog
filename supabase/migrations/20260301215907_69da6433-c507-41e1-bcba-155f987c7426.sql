
-- Acquisition settings per pane (or per project for non-mosaic)
CREATE TABLE public.project_acquisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pane_id UUID REFERENCES public.project_panes(id) ON DELETE CASCADE,
  filter TEXT NOT NULL DEFAULT 'L',
  exposure_duration NUMERIC NOT NULL DEFAULT 300,
  quantity INTEGER NOT NULL DEFAULT 10,
  bin INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_acquisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view acquisitions" ON public.project_acquisitions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_acquisitions.project_id 
      AND ((p.team_id IS NOT NULL AND is_team_member(p.team_id)) OR (p.team_id IS NULL AND p.created_by = auth.uid())))
  );

CREATE POLICY "Users can create acquisitions" ON public.project_acquisitions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_acquisitions.project_id 
      AND ((p.team_id IS NOT NULL AND is_team_admin(p.team_id)) OR (p.team_id IS NULL AND p.created_by = auth.uid())))
  );

CREATE POLICY "Users can update acquisitions" ON public.project_acquisitions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_acquisitions.project_id 
      AND ((p.team_id IS NOT NULL AND is_team_admin(p.team_id)) OR (p.team_id IS NULL AND p.created_by = auth.uid())))
  );

CREATE POLICY "Users can delete acquisitions" ON public.project_acquisitions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_acquisitions.project_id 
      AND ((p.team_id IS NOT NULL AND is_team_admin(p.team_id)) OR (p.team_id IS NULL AND p.created_by = auth.uid())))
  );

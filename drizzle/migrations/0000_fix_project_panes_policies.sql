DROP POLICY IF EXISTS "Team members can view panes" ON public.project_panes;
DROP POLICY IF EXISTS "Team admin can create panes" ON public.project_panes;
DROP POLICY IF EXISTS "Team admin can update panes" ON public.project_panes;
DROP POLICY IF EXISTS "Team admin can delete panes" ON public.project_panes;

CREATE POLICY "Users can view panes" ON public.project_panes FOR SELECT
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_panes.project_id AND (((p.team_id IS NOT NULL) AND is_team_member(p.team_id)) OR ((p.team_id IS NULL) AND p.created_by = auth.uid()))));

CREATE POLICY "Users can create panes" ON public.project_panes FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_panes.project_id AND (((p.team_id IS NOT NULL) AND is_team_admin(p.team_id)) OR ((p.team_id IS NULL) AND p.created_by = auth.uid()))));

CREATE POLICY "Users can update panes" ON public.project_panes FOR UPDATE
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_panes.project_id AND (((p.team_id IS NOT NULL) AND is_team_admin(p.team_id)) OR ((p.team_id IS NULL) AND p.created_by = auth.uid()))));

CREATE POLICY "Users can delete panes" ON public.project_panes FOR DELETE
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_panes.project_id AND (((p.team_id IS NOT NULL) AND is_team_admin(p.team_id)) OR ((p.team_id IS NULL) AND p.created_by = auth.uid()))));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_panes TO authenticated;
GRANT ALL ON public.project_panes TO service_role;
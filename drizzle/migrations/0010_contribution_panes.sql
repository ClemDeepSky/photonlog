ALTER TABLE public.project_panes ADD COLUMN IF NOT EXISTS contribution_id uuid REFERENCES public.project_contributions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS project_panes_contribution_idx ON public.project_panes(contribution_id);

ALTER POLICY "Users can create panes" ON public.project_panes WITH CHECK (contribution_id IS NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_panes.project_id AND ((p.team_id IS NOT NULL AND public.is_team_admin(p.team_id)) OR (p.team_id IS NULL AND p.created_by = auth.uid()))));
ALTER POLICY "Users can update panes" ON public.project_panes USING (contribution_id IS NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_panes.project_id AND ((p.team_id IS NOT NULL AND public.is_team_admin(p.team_id)) OR (p.team_id IS NULL AND p.created_by = auth.uid()))));
ALTER POLICY "Users can delete panes" ON public.project_panes USING (contribution_id IS NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_panes.project_id AND ((p.team_id IS NOT NULL AND public.is_team_admin(p.team_id)) OR (p.team_id IS NULL AND p.created_by = auth.uid()))));

CREATE POLICY "Contributors insert own panes" ON public.project_panes FOR INSERT TO authenticated WITH CHECK (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));
CREATE POLICY "Contributors update own panes" ON public.project_panes FOR UPDATE TO authenticated USING (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id)) WITH CHECK (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));
CREATE POLICY "Contributors delete own panes" ON public.project_panes FOR DELETE TO authenticated USING (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));
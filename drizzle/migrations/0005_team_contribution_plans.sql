ALTER TABLE public.project_acquisitions ADD COLUMN IF NOT EXISTS contribution_id uuid REFERENCES public.project_contributions(id) ON DELETE CASCADE;
ALTER TABLE public.project_frames ADD COLUMN IF NOT EXISTS contribution_id uuid REFERENCES public.project_contributions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_project_acquisitions_contribution ON public.project_acquisitions(contribution_id);
CREATE INDEX IF NOT EXISTS idx_project_frames_contribution ON public.project_frames(contribution_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_contributions_project_user ON public.project_contributions(project_id, user_id);

CREATE OR REPLACE FUNCTION public.can_edit_contribution(_contribution_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_contributions c
    JOIN public.projects p ON p.id = c.project_id
    WHERE c.id = _contribution_id
      AND (
        c.user_id = auth.uid()
        OR (p.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.teams t WHERE t.id = p.team_id AND t.owner_id = auth.uid() AND t.management_mode = 'single_admin'))
      )
  )
$$;

CREATE POLICY "Contributors insert own plan lines" ON public.project_acquisitions FOR INSERT TO authenticated
  WITH CHECK (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));
CREATE POLICY "Contributors update own plan lines" ON public.project_acquisitions FOR UPDATE TO authenticated
  USING (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id))
  WITH CHECK (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));
CREATE POLICY "Contributors delete own plan lines" ON public.project_acquisitions FOR DELETE TO authenticated
  USING (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));

CREATE POLICY "Contributors insert own frames" ON public.project_frames FOR INSERT TO authenticated
  WITH CHECK (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));
CREATE POLICY "Contributors update own frames" ON public.project_frames FOR UPDATE TO authenticated
  USING (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id))
  WITH CHECK (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));
CREATE POLICY "Contributors delete own frames" ON public.project_frames FOR DELETE TO authenticated
  USING (contribution_id IS NOT NULL AND public.can_edit_contribution(contribution_id));

-- Allow personal projects (no team)
ALTER TABLE public.projects ALTER COLUMN team_id DROP NOT NULL;

-- Update RLS: personal projects visible to creator
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
CREATE POLICY "Users can view projects"
  ON public.projects FOR SELECT
  USING (
    (team_id IS NOT NULL AND is_team_member(team_id))
    OR (team_id IS NULL AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Team admin can create projects" ON public.projects;
CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND (
      team_id IS NULL
      OR is_team_admin(team_id)
    )
  );

DROP POLICY IF EXISTS "Team admin can update projects" ON public.projects;
CREATE POLICY "Users can update projects"
  ON public.projects FOR UPDATE
  USING (
    (team_id IS NOT NULL AND is_team_admin(team_id))
    OR (team_id IS NULL AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Team admin can delete projects" ON public.projects;
CREATE POLICY "Users can delete projects"
  ON public.projects FOR DELETE
  USING (
    (team_id IS NOT NULL AND is_team_admin(team_id))
    OR (team_id IS NULL AND created_by = auth.uid())
  );

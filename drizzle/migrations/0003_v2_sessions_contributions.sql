-- V2 additive schema: contributions, sessions, batches. Nothing existing is dropped.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.project_acquisitions
  ADD COLUMN IF NOT EXISTS target_seconds NUMERIC;

-- Helper: can the current user see this project (personal owner or team member)?
CREATE OR REPLACE FUNCTION public.can_access_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (
        (p.team_id IS NULL AND p.created_by = auth.uid())
        OR (p.team_id IS NOT NULL AND public.is_team_member(p.team_id))
      )
  )
$$;

-- Helper: can the current user modify this project's structure?
CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (
        (p.team_id IS NULL AND p.created_by = auth.uid())
        OR (p.team_id IS NOT NULL AND public.is_team_admin(p.team_id))
      )
  )
$$;

-- One row per contributing member. Personal projects have exactly one (the owner).
CREATE TABLE IF NOT EXISTS public.project_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tracking_mode TEXT NOT NULL DEFAULT 'manual',
  setup TEXT,
  equipment_profile_id UUID REFERENCES public.equipment_profiles(id) ON DELETE SET NULL,
  folder_path TEXT,
  filename_pattern TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_contributions TO authenticated;
GRANT ALL ON public.project_contributions TO service_role;
ALTER TABLE public.project_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contributions"
  ON public.project_contributions FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "Users manage own contribution"
  ON public.project_contributions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_project(project_id));

CREATE POLICY "Users update own contribution"
  ON public.project_contributions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_project(project_id));

CREATE POLICY "Users delete own contribution"
  ON public.project_contributions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_project(project_id));

-- A session is a real acquisition period, usually one night.
CREATE TABLE IF NOT EXISTS public.project_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contribution_id UUID REFERENCES public.project_contributions(id) ON DELETE SET NULL,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  source TEXT NOT NULL DEFAULT 'manual',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_sessions_project_started_idx
  ON public.project_sessions (project_id, started_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_sessions TO authenticated;
GRANT ALL ON public.project_sessions TO service_role;
ALTER TABLE public.project_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sessions"
  ON public.project_sessions FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "Members can create sessions"
  ON public.project_sessions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_project(project_id) AND created_by = auth.uid());

CREATE POLICY "Owners can update sessions"
  ON public.project_sessions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.can_edit_project(project_id));

CREATE POLICY "Owners can delete sessions"
  ON public.project_sessions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.can_edit_project(project_id));

-- A batch of subs inside a session: the manual input unit, and the computed
-- summary of an automatic session.
CREATE TABLE IF NOT EXISTS public.session_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.project_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pane_id UUID REFERENCES public.project_panes(id) ON DELETE SET NULL,
  acquisition_id UUID REFERENCES public.project_acquisitions(id) ON DELETE SET NULL,
  filter TEXT NOT NULL DEFAULT 'L',
  exposure_duration NUMERIC NOT NULL DEFAULT 0,
  sub_count INTEGER NOT NULL DEFAULT 0,
  bin INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_batches_session_idx ON public.session_batches (session_id);
CREATE INDEX IF NOT EXISTS session_batches_project_idx ON public.session_batches (project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_batches TO authenticated;
GRANT ALL ON public.session_batches TO service_role;
ALTER TABLE public.session_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view batches"
  ON public.session_batches FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "Members can insert batches"
  ON public.session_batches FOR INSERT TO authenticated
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "Members can update batches"
  ON public.session_batches FOR UPDATE TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "Members can delete batches"
  ON public.session_batches FOR DELETE TO authenticated
  USING (public.can_access_project(project_id));

-- Link indexed frames to their session (nullable, V1 untouched).
ALTER TABLE public.project_frames
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.project_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS project_frames_session_idx ON public.project_frames (session_id);

CREATE TRIGGER update_project_contributions_updated_at
  BEFORE UPDATE ON public.project_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_project_sessions_updated_at
  BEFORE UPDATE ON public.project_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

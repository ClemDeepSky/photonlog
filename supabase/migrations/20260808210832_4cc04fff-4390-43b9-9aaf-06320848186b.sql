-- 1. Storage: ownership checks on team-logos bucket
DROP POLICY IF EXISTS "Team admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Team admins can delete logos" ON storage.objects;

CREATE POLICY "Team admins or owners can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-logos' AND (
    (
      (storage.foldername(name))[1] = 'projects'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND public.is_team_admin(((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Team admins or owners can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'team-logos' AND (
    (
      (storage.foldername(name))[1] = 'projects'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND public.is_team_admin(((storage.foldername(name))[1])::uuid)
    )
  )
)
WITH CHECK (
  bucket_id = 'team-logos' AND (
    (
      (storage.foldername(name))[1] = 'projects'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND public.is_team_admin(((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Team admins or owners can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'team-logos' AND (
    (
      (storage.foldername(name))[1] = 'projects'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND public.is_team_admin(((storage.foldername(name))[1])::uuid)
    )
  )
);

-- 2. team_members: prevent self-add / role escalation
DROP POLICY IF EXISTS "Team admin can add members" ON public.team_members;
CREATE POLICY "Team admin can add members"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_team_admin(team_id)
  AND user_id <> auth.uid()
  AND role = 'member'
);

DROP POLICY IF EXISTS "Team admin can update members" ON public.team_members;
CREATE POLICY "Team admin can update members"
ON public.team_members FOR UPDATE TO authenticated
USING (public.is_team_admin(team_id) AND user_id <> auth.uid())
WITH CHECK (
  public.is_team_admin(team_id)
  AND user_id <> auth.uid()
  AND role = 'member'
);

DROP POLICY IF EXISTS "Team admin can remove members" ON public.team_members;
CREATE POLICY "Team admin can remove members"
ON public.team_members FOR DELETE TO authenticated
USING (public.is_team_admin(team_id) OR user_id = auth.uid());

-- 3. Revoke anon access to all application tables (GraphQL/API exposure)
REVOKE ALL ON public.profiles, public.projects, public.project_acquisitions,
  public.project_panes, public.equipment_profiles, public.teams,
  public.team_invitations, public.team_members, public.email_send_log,
  public.email_send_state, public.email_unsubscribe_tokens,
  public.suppressed_emails FROM anon;

-- Email/internal tables: service_role only, not signed-in users
REVOKE ALL ON public.email_send_log, public.email_send_state,
  public.email_unsubscribe_tokens, public.suppressed_emails FROM authenticated;
GRANT ALL ON public.email_send_log, public.email_send_state,
  public.email_unsubscribe_tokens, public.suppressed_emails TO service_role;

-- Application tables for signed-in users (RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.projects,
  public.project_acquisitions, public.project_panes, public.equipment_profiles,
  public.teams, public.team_invitations, public.team_members TO authenticated;
GRANT ALL ON public.profiles, public.projects, public.project_acquisitions,
  public.project_panes, public.equipment_profiles, public.teams,
  public.team_invitations, public.team_members TO service_role;

-- 4. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_team() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_team_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- 5. Fix mutable search_path on remaining SECURITY DEFINER functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
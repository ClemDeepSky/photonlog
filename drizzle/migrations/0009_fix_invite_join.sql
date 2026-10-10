CREATE OR REPLACE FUNCTION public.has_pending_invitation(_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_invitations ti
    WHERE ti.team_id = _team_id AND ti.status = 'pending' AND ti.expires_at > now()
      AND lower(ti.email) = lower(public.current_user_email()));
$$;
GRANT EXECUTE ON FUNCTION public.has_pending_invitation(uuid) TO authenticated;
DROP POLICY IF EXISTS "Invited user can join team" ON public.team_members;
CREATE POLICY "Invited user can join team" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'member' AND public.has_pending_invitation(team_id));
DROP POLICY IF EXISTS "Invited user can view own invitation" ON public.team_invitations;
CREATE POLICY "Invited user can view own invitation" ON public.team_invitations FOR SELECT TO authenticated
  USING (lower(email) = lower(public.current_user_email()));
CREATE POLICY "Invited user can join team"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.team_id = team_members.team_id
      AND ti.status = 'pending'
      AND ti.expires_at > now()
      AND lower(ti.email) = lower((SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text)
  )
);
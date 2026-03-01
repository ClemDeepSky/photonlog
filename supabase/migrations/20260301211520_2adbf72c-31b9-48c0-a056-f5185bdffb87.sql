-- Allow invitation status to be updated by the invited user (matching email)
CREATE POLICY "Invited user can accept invitation"
ON public.team_invitations
FOR UPDATE
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

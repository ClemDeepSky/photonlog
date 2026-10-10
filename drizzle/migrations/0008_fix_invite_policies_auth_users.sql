-- Fonction sécurisée retournant l'email de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Règle d'acceptation d'invitation : ne lit plus auth.users directement
DROP POLICY IF EXISTS "Invited user can accept invitation" ON public.team_invitations;
CREATE POLICY "Invited user can accept invitation"
ON public.team_invitations
FOR UPDATE
TO authenticated
USING (email = public.current_user_email())
WITH CHECK (email = public.current_user_email());

-- Règle d'adhésion : idem
DROP POLICY IF EXISTS "Invited user can join team" ON public.team_members;
CREATE POLICY "Invited user can join team"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.team_id = team_members.team_id
      AND ti.status = 'pending'
      AND ti.expires_at > now()
      AND lower(ti.email) = lower(public.current_user_email())
  )
);
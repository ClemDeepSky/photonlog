-- Add management mode and team info columns
ALTER TABLE public.teams
ADD COLUMN management_mode text NOT NULL DEFAULT 'single_admin',
ADD COLUMN website text,
ADD COLUMN logo_url text;

-- Create a function to check if a user is a team admin (handles both modes)
CREATE OR REPLACE FUNCTION public.is_team_admin(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Single admin mode: only the owner
    SELECT 1 FROM public.teams
    WHERE id = _team_id AND owner_id = auth.uid() AND management_mode = 'single_admin'
  ) OR EXISTS (
    -- Collaborative mode: any team member
    SELECT 1 FROM public.teams t
    JOIN public.team_members tm ON tm.team_id = t.id
    WHERE t.id = _team_id AND t.management_mode = 'collaborative' AND tm.user_id = auth.uid()
  );
$$;

-- Update team policies to use is_team_admin for write operations
DROP POLICY IF EXISTS "Team owner can update" ON public.teams;
CREATE POLICY "Team admin can update"
ON public.teams
FOR UPDATE
USING (public.is_team_admin(id));

DROP POLICY IF EXISTS "Team owner can delete" ON public.teams;
CREATE POLICY "Team admin can delete"
ON public.teams
FOR DELETE
USING (public.is_team_admin(id));

-- Update invitation policies
DROP POLICY IF EXISTS "Team owner can create invitations" ON public.team_invitations;
CREATE POLICY "Team admin can create invitations"
ON public.team_invitations
FOR INSERT
WITH CHECK (public.is_team_admin(team_id));

DROP POLICY IF EXISTS "Team owner can delete invitations" ON public.team_invitations;
CREATE POLICY "Team admin can delete invitations"
ON public.team_invitations
FOR DELETE
USING (public.is_team_admin(team_id));

-- Update member policies
DROP POLICY IF EXISTS "Team owner can add members" ON public.team_members;
CREATE POLICY "Team admin can add members"
ON public.team_members
FOR INSERT
WITH CHECK (public.is_team_admin(team_id));

DROP POLICY IF EXISTS "Team owner can remove members" ON public.team_members;
CREATE POLICY "Team admin can remove members"
ON public.team_members
FOR DELETE
USING (public.is_team_admin(team_id) OR user_id = auth.uid());

-- Allow team admins to update member roles
CREATE POLICY "Team admin can update members"
ON public.team_members
FOR UPDATE
USING (public.is_team_admin(team_id));

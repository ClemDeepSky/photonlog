
-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  target_object TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies: team members can view projects
CREATE POLICY "Team members can view projects"
ON public.projects FOR SELECT
USING (is_team_member(team_id));

-- Team admin can create projects
CREATE POLICY "Team admin can create projects"
ON public.projects FOR INSERT
WITH CHECK (is_team_admin(team_id) AND created_by = auth.uid());

-- Team admin can update projects
CREATE POLICY "Team admin can update projects"
ON public.projects FOR UPDATE
USING (is_team_admin(team_id));

-- Team admin can delete projects
CREATE POLICY "Team admin can delete projects"
ON public.projects FOR DELETE
USING (is_team_admin(team_id));

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

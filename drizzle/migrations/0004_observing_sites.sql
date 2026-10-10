CREATE TABLE public.observing_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  country text,
  city text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  elevation numeric,
  timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observing_sites TO authenticated;
GRANT ALL ON public.observing_sites TO service_role;
ALTER TABLE public.observing_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sites select" ON public.observing_sites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own sites insert" ON public.observing_sites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own sites update" ON public.observing_sites FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own sites delete" ON public.observing_sites FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER observing_sites_updated BEFORE UPDATE ON public.observing_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.projects ADD COLUMN observing_site_id uuid REFERENCES public.observing_sites(id) ON DELETE SET NULL;
CREATE POLICY "project site readable" ON public.observing_sites FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.observing_site_id = observing_sites.id AND public.can_access_project(p.id)));
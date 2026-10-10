ALTER TABLE public.project_contributions ADD COLUMN IF NOT EXISTS observing_site_id uuid REFERENCES public.observing_sites(id) ON DELETE SET NULL;
CREATE POLICY "contribution site readable" ON public.observing_sites FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.project_contributions c WHERE c.observing_site_id = observing_sites.id AND public.can_access_project(c.project_id)));
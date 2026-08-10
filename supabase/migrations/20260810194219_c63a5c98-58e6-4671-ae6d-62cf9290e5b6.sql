ALTER TABLE public.project_acquisitions
ADD COLUMN kept integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.project_acquisitions.kept IS 'Nombre de frames retenues après tri/rejet';
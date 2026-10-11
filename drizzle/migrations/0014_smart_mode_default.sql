ALTER TABLE public.projects ALTER COLUMN tracking_mode SET DEFAULT 'automatic';
ALTER TABLE public.project_contributions ALTER COLUMN tracking_mode SET DEFAULT 'automatic';
UPDATE public.projects SET tracking_mode = CASE WHEN folder_path IS NOT NULL AND folder_path <> '' THEN 'automatic' ELSE 'manual' END WHERE schema_version = 1 AND team_id IS NULL;
UPDATE public.project_contributions SET tracking_mode = CASE WHEN folder_path IS NOT NULL AND folder_path <> '' THEN 'automatic' ELSE 'manual' END;
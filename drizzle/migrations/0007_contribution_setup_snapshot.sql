ALTER TABLE public.project_contributions
  ADD COLUMN IF NOT EXISTS focal_length numeric,
  ADD COLUMN IF NOT EXISTS sensor_width_mm numeric,
  ADD COLUMN IF NOT EXISTS sensor_height_mm numeric;
ALTER TABLE public.equipment_profiles
  ADD COLUMN IF NOT EXISTS corrector text,
  ADD COLUMN IF NOT EXISTS operating_system text,
  ADD COLUMN IF NOT EXISTS acquisition_software text;
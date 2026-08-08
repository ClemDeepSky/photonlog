CREATE TABLE public.equipment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  diameter numeric,
  focal_length numeric,
  imager_name text,
  pixel_size numeric,
  sensor_width_px integer,
  sensor_height_px integer,
  mount text,
  guide_camera text,
  filters text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_profiles TO authenticated;
GRANT ALL ON public.equipment_profiles TO service_role;

ALTER TABLE public.equipment_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own equipment" ON public.equipment_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own equipment" ON public.equipment_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own equipment" ON public.equipment_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own equipment" ON public.equipment_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_equipment_profiles_updated_at BEFORE UPDATE ON public.equipment_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
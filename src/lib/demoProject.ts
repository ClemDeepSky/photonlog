import { supabase } from "@/integrations/supabase/client";

export const DEMO_PROJECT_NAME = "Démo — M31 Galaxie d'Andromède";

const DEMO_ACQUISITIONS = [
  { filter: "L", exposure_duration: 120, quantity: 60, bin: 1, acquired: 48 },
  { filter: "R", exposure_duration: 180, quantity: 30, bin: 1, acquired: 22 },
  { filter: "G", exposure_duration: 180, quantity: 30, bin: 1, acquired: 18 },
  { filter: "B", exposure_duration: 180, quantity: 30, bin: 1, acquired: 12 },
  { filter: "Ha", exposure_duration: 300, quantity: 24, bin: 1, acquired: 9 },
];

/** Returns the id of the existing demo project for this user, or null. */
export const findDemoProject = async (userId: string) => {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("created_by", userId)
    .eq("name", DEMO_PROJECT_NAME)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
};

/** Creates the demo project with sample acquisitions and returns its id. */
export const createDemoProject = async (userId: string) => {
  const existing = await findDemoProject(userId);
  if (existing) return existing;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: DEMO_PROJECT_NAME,
      description:
        "Projet d'exemple créé pour la visite guidée. Vous pouvez le modifier ou le supprimer à tout moment.",
      created_by: userId,
      status: "active",
      target_object: "M31",
      is_mosaic: false,
      ra: "00h 42m 44s",
      dec: "+41° 16' 09\"",
      position_angle: 0,
      setup: "Setup de démonstration",
      filename_pattern:
        "$$TARGETNAME$$_$$IMAGETYPE$$_$$FILTER$$_$$DATE$$_$$TIME$$_$$SENSORTEMP$$_$$EXPOSURETIME$$s_FWHM$$FWHM$$_ex$$ECCENTRICITY$$_starsCount-$$STARCOUNT$$_hfr-$$HFR$$_$$FRAMENR$$",
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: acqError } = await supabase.from("project_acquisitions").insert(
    DEMO_ACQUISITIONS.map((a) => ({ ...a, project_id: project.id }))
  );
  if (acqError) throw acqError;

  return project.id as string;
};

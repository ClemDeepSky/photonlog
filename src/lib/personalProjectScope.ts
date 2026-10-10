import { supabase } from "@/integrations/supabase/client";

/** Explicit personal scope; administrative RLS read access must not widen normal lists. */
export async function personalProjectFilter(userId: string | undefined): Promise<string> {
  if (!userId) throw new Error("Connexion requise");
  const [memberships, ownedTeams] = await Promise.all([
    supabase.from("team_members").select("team_id").eq("user_id", userId),
    supabase.from("teams").select("id").eq("owner_id", userId),
  ]);
  if (memberships.error) throw memberships.error;
  if (ownedTeams.error) throw ownedTeams.error;
  const teamIds = [...new Set([
    ...(memberships.data ?? []).map((row) => row.team_id),
    ...(ownedTeams.data ?? []).map((row) => row.id),
  ])];
  const personal = `and(team_id.is.null,created_by.eq.${userId})`;
  return teamIds.length ? `${personal},team_id.in.(${teamIds.join(",")})` : personal;
}
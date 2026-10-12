import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeNight, parseDecDeg, parseRaDeg, type ObservingSite } from "@/lib/nightConditions";

type NightRange = { night: string; firstAt: string; lastAt: string };

const fmt = (d: Date | null) => (d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
const fmtDay = (d: Date | null, night: string) => {
  if (!d) return "—";
  const evening = new Date(`${night}T12:00:00`);
  const nextDay = d.getTime() - evening.getTime() > 12 * 3600e3;
  return `${fmt(d)}${nextDay ? " (+1)" : ""}`;
};

const NightConditionsTable = ({ projectId, nights }: { projectId: string; nights: NightRange[] }) => {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["project-site-target", projectId, user?.id],
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("projects")
        .select("ra, dec, is_mosaic, observing_site_id")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      let site: ObservingSite | null = null;
      // Projet Team : le site est propre à chaque membre (sa contribution), sinon celui du projet.
      const { data: mine } = user
        ? await supabase.from("project_contributions").select("id, observing_site_id").eq("project_id", projectId).eq("user_id", user.id).maybeSingle()
        : { data: null };
      const siteId = mine?.observing_site_id || p.observing_site_id;
      if (siteId) {
        const { data: s } = await supabase.from("observing_sites").select("*").eq("id", siteId).maybeSingle();
        site = (s as ObservingSite) ?? null;
      }
      let ra = p.ra, dec = p.dec;
      if (p.is_mosaic) {
        const { data: panes } = await supabase.from("project_panes").select("ra, dec").eq("project_id", projectId).is("contribution_id", null).order("pane_number").limit(1);
        ra = panes?.[0]?.ra ?? null; dec = panes?.[0]?.dec ?? null;
      }
      if ((!ra || !dec) && mine) {
        const { data: own } = await supabase.from("project_panes").select("ra, dec").eq("contribution_id", mine.id).order("pane_number").limit(1);
        ra = own?.[0]?.ra ?? ra; dec = own?.[0]?.dec ?? dec;
      }
      return { site, ra: parseRaDeg(ra), dec: parseDecDeg(dec) };
    },
  });

  const rows = useMemo(() => {
    if (!data?.site) return [];
    return nights.map((n) => ({ ...n, c: computeNight(data.site!, n.night, n.firstAt, n.lastAt, data.ra, data.dec) }));
  }, [data, nights]);

  if (!data) return null;
  if (!data.site) {
    return (
      <p className="text-xs text-muted-foreground">
        Associez un site d'observation au projet (<Link to={`/projects/${projectId}/edit`} className="underline">paramètres du projet</Link>) pour afficher la nuit astronomique et la position de la lune.
      </p>
    );
  }

  return (
    <details className="rounded-md border border-border/60">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
        Conditions par nuit — {data.site.name}
      </summary>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-t border-border/60">
              <th className="px-3 py-1.5 text-left font-normal">Nuit</th>
              <th className="px-3 py-1.5 text-left font-normal">Nuit astronomique</th>
              <th className="px-3 py-1.5 text-left font-normal">Acquisitions</th>
              <th className="px-3 py-1.5 text-left font-normal">Lune</th>
              <th className="px-3 py-1.5 text-left font-normal">Lever / coucher</th>
              <th className="px-3 py-1.5 text-left font-normal">Hauteur max</th>
              <th className="px-3 py-1.5 text-left font-normal">Distance cible</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ night, firstAt, lastAt, c }) => {
              const up = (c.moonAltMaxDuringAcq ?? -1) > 0;
              return (
                <tr key={night} className="border-t border-border/40">
                  <td className="px-3 py-1.5 whitespace-nowrap">{new Date(`${night}T12:00:00`).toLocaleDateString("fr-FR")}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDay(c.duskAstro, night)} → {fmtDay(c.dawnAstro, night)}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDay(new Date(firstAt), night)} → {fmtDay(new Date(lastAt), night)}</td>
                  <td className="px-3 py-1.5">{c.illumination} %</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">↑ {fmtDay(c.moonRise, night)} · ↓ {fmtDay(c.moonSet, night)}</td>
                  <td className={`px-3 py-1.5 ${up ? "text-destructive" : "text-muted-foreground"}`}>
                    {c.moonAltMaxDuringAcq !== null ? `${Math.round(c.moonAltMaxDuringAcq)}°` : "—"}{!up && " (couchée)"}
                  </td>
                  <td className="px-3 py-1.5">{c.separation !== null ? `${Math.round(c.separation)}°` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-3 pb-2 pt-1 text-[11px] text-muted-foreground">
        Hauteur max = hauteur la plus élevée de la lune pendant vos acquisitions. Heures locales de votre navigateur ; (+1) = lendemain matin.
      </p>
    </details>
  );
};

export default NightConditionsTable;

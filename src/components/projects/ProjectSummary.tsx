// Bloc « Résumé du projet » : présentation rédigée, générée à partir des données
// déjà enregistrées (objectifs, avancement, FWHM). Aucune saisie manuelle.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildProjectSummary, type SummaryFwhm, type SummaryLine, type SummaryPlanLine } from "@/lib/projectSummary";

const PAGE = 1000;

/** FWHM moyenne par filtre, sur toutes les brutes indexées du projet (tous panneaux). */
export function useProjectFwhm(projectId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project-fwhm", projectId, user?.id],
    enabled: !!projectId && !!user,
    queryFn: async (): Promise<SummaryFwhm[]> => {
      if (!projectId) return [];
      const acc = new Map<string, { sum: number; count: number }>();
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("project_frames")
          .select("filter, fwhm")
          .eq("project_id", projectId)
          .not("fwhm", "is", null)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        for (const row of data ?? []) {
          const filter = (row.filter ?? "").trim();
          const value = Number(row.fwhm);
          if (!filter || !Number.isFinite(value) || value <= 0) continue;
          const entry = acc.get(filter) ?? { sum: 0, count: 0 };
          entry.sum += value;
          entry.count += 1;
          acc.set(filter, entry);
        }
        if (!data || data.length < PAGE) break;
      }
      return [...acc.entries()].map(([filter, e]) => ({ filter, avg: e.sum / e.count }));
    },
  });
}

/**
 * Les lignes du résumé sont lues là où elles sont produites : sous leur forme
 * actuelle { kind, text }, mais aussi sous une forme plus ancienne (liste de
 * segments ou simple chaîne) si un module intermédiaire les a fournies ainsi.
 * Le bloc s'adapte au lieu de faire disparaître la page.
 */
const normalizeSummaryLines = (summary: { paragraphs?: unknown } | null): SummaryLine[] => {
  const raw = summary?.paragraphs;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p): SummaryLine | null => {
      if (typeof p === "string") return p ? { kind: "detail", text: p } : null;
      if (Array.isArray(p)) {
        const text = p.map((s) => (typeof s === "string" ? s : (s as SummaryLine)?.text ?? "")).join("");
        return text ? { kind: "detail", text } : null;
      }
      const line = p as SummaryLine;
      if (line && typeof line.text === "string") {
        const kind = line.kind === "intro" || line.kind === "progress" ? line.kind : "detail";
        return { kind, text: line.text };
      }
      return null;
    })
    .filter((p): p is SummaryLine => p !== null);
};

interface Props {
  projectId: string;
  target: string;
  isMosaic: boolean;
  paneCount: number | null;
  lines: SummaryPlanLine[] | null | undefined;
  /** Progression globale déjà calculée par la page appelante. */
  progressPercent: number;
  /** FWHM déjà calculée par la page appelante : évite une seconde lecture en base. */
  fwhmByFilter?: SummaryFwhm[];
  title?: string;
}

const ProjectSummary = ({
  projectId,
  target,
  isMosaic,
  paneCount,
  lines,
  progressPercent,
  fwhmByFilter,
  title = "Résumé du projet",
}: Props) => {
  // La page peut fournir sa propre FWHM (Frames) : on ne relit alors rien.
  const { data: ownFwhm } = useProjectFwhm(fwhmByFilter == null ? projectId : null);
  const fwhm = fwhmByFilter ?? ownFwhm;
  const [copied, setCopied] = useState(false);

  const summary = useMemo(
    () =>
      lines
        ? buildProjectSummary({ target, isMosaic, paneCount, lines, fwhmByFilter: fwhm, progressPercent })
        : null,
    [lines, target, isMosaic, paneCount, fwhm, progressPercent],
  );

  const rows = useMemo(() => normalizeSummaryLines(summary), [summary]);

  if (!summary || rows.length === 0) return null;

  const copy = async () => {
    const text = summary.text;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Accès au presse-papiers refusé : on passe par une zone de saisie cachée.
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "-1000px";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Résumé copié" });
    } else {
      toast({
        title: "Copie impossible",
        description: "Votre navigateur n'autorise pas l'accès au presse-papiers.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Texte généré automatiquement à partir des objectifs, de l'avancement et de la FWHM enregistrés.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copy} className="shrink-0 h-7 px-2.5 text-xs">
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            Copier le texte
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-2">
          {rows
            .filter((p) => p.kind === "intro")
            .map((p, i) => (
              <p key={i} className="text-xs font-semibold leading-relaxed text-foreground">
                {p.text}
              </p>
            ))}
          {rows
            .filter((p) => p.kind === "progress")
            .map((p, i) => (
              <p key={i} className="text-xs italic leading-relaxed text-muted-foreground">
                {p.text}
              </p>
            ))}
          {rows.filter((p) => p.kind === "detail").length > 0 && (
            <ul className="list-disc space-y-1 pl-4">
              {rows
                .filter((p) => p.kind === "detail")
                .map((p, i) => (
                  <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                    {p.text}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectSummary;

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
import { buildProjectSummary, type SummaryFwhm, type SummaryPlanLine } from "@/lib/projectSummary";

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

interface Props {
  projectId: string;
  target: string;
  isMosaic: boolean;
  paneCount: number | null;
  lines: SummaryPlanLine[] | null | undefined;
  /** Progression globale déjà calculée par la page appelante. */
  progressPercent: number;
  title?: string;
}

const ProjectSummary = ({
  projectId,
  target,
  isMosaic,
  paneCount,
  lines,
  progressPercent,
  title = "Résumé du projet",
}: Props) => {
  const { data: fwhmByFilter } = useProjectFwhm(projectId);
  const [copied, setCopied] = useState(false);

  const summary = useMemo(
    () =>
      lines
        ? buildProjectSummary({ target, isMosaic, paneCount, lines, fwhmByFilter, progressPercent })
        : null,
    [lines, target, isMosaic, paneCount, fwhmByFilter, progressPercent],
  );

  if (!summary || summary.paragraphs.length === 0) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Résumé copié" });
    } catch {
      toast({ title: "Copie impossible", description: "Votre navigateur n'autorise pas l'accès au presse-papiers.", variant: "destructive" });
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Texte généré automatiquement à partir des objectifs, de l'avancement et de la FWHM enregistrés.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            Copier le texte
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.paragraphs.map((paragraph, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {paragraph.map((segment, j) =>
              segment.strong ? (
                <strong key={j} className="font-semibold text-foreground">
                  {segment.text}
                </strong>
              ) : (
                <span key={j}>{segment.text}</span>
              ),
            )}
          </p>
        ))}
      </CardContent>
    </Card>
  );
};

export default ProjectSummary;

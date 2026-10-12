import { useEffect, useState, type ReactNode } from "react";
import { Grid3X3, LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CollectionMode = "3" | "6" | "list";

export function useCollectionView() {
  const [mode, setMode] = useState<CollectionMode>("3");
  const [width, setWidth] = useState(0);
  const [element, ref] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  const columns = width >= 780 ? 3 : width >= 500 ? 2 : 1;
  const effectiveMode = mode === "6" && width < 1260 ? "3" : mode;
  return { mode, setMode, ref, columns, effectiveMode, canSix: width >= 1260 };
}

export function CollectionViewSelector({ view }: { view: ReturnType<typeof useCollectionView> }) {
  const options = [
    { value: "3" as const, label: `${view.columns} colonne${view.columns > 1 ? "s" : ""}`, icon: LayoutGrid },
    { value: "6" as const, label: "6 colonnes", icon: Grid3X3 },
    { value: "list" as const, label: "Liste", icon: List },
  ];
  return <div role="group" aria-label="Affichage" className="flex shrink-0 gap-1 rounded-md border border-border/50 p-1">
    {options.filter((option) => option.value !== "6" || view.canSix).map((option) => (
      <Tooltip key={option.value}>
        <TooltipTrigger asChild>
          <Button size="icon" variant={view.effectiveMode === option.value ? "secondary" : "ghost"} aria-label={option.label} aria-pressed={view.effectiveMode === option.value} onClick={() => view.setMode(option.value)} className="h-8 w-8">
            <option.icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{option.label}</TooltipContent>
      </Tooltip>
    ))}
  </div>;
}

export function CollectionGrid({ view, children, kind }: { view: ReturnType<typeof useCollectionView>; children: ReactNode; kind: "teams" | "equipment" | "sites" | "projects" }) {
  return <div ref={view.ref} className={cn("collection-grid", `collection-${kind}`)} data-mode={view.effectiveMode} data-columns={view.columns}>{children}</div>;
}

export function AddCollectionItem({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button variant="outline" onClick={onClick} className="collection-add h-auto min-h-28 w-full flex-col gap-3 whitespace-normal rounded-lg border-2 border-dashed border-primary/40 bg-transparent p-6 text-center text-primary hover:border-primary hover:bg-primary/5">
    <Plus className="h-6 w-6 shrink-0" /><span>{label}</span>
  </Button>;
}
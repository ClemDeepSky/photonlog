import type { ReactNode } from "react";
import CoordinateInputs, { type Epoch } from "@/components/CoordinateInputs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, Trash2 } from "lucide-react";

type Pane = { id?: string; pane_number: number; ra: string; dec: string; position_angle: number | null };
type Props = {
  isMosaic: boolean;
  onMosaicChange: (value: boolean) => void;
  mode: "manual" | "csv";
  onModeChange: (value: "manual" | "csv") => void;
  epoch: Epoch;
  onEpochChange: (value: Epoch) => void;
  ra: string;
  dec: string;
  angle: string;
  onRaChange: (value: string) => void;
  onDecChange: (value: string) => void;
  onAngleChange: (value: string) => void;
  panes: Pane[];
  onPaneCoordinatesChange: (index: number, ra: string, dec: string) => void;
  onPaneAngleChange: (index: number, value: string) => void;
  onAddPane: () => void;
  onRemovePane: (index: number) => void;
  csvUpload: ReactNode;
  viewer: ReactNode;
};

export default function ProjectCoordinates(props: Props) {
  return (
    <Card data-testid="project-coordinates">
      <CardContent className="pt-6">
        <h2 className="mb-4 text-lg font-semibold">Coordonnées et cadrage</h2>
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,2fr)_minmax(0,3fr)]">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <Switch id="mosaic" checked={props.isMosaic} onCheckedChange={props.onMosaicChange} />
              <Label htmlFor="mosaic">Projet mosaïque (plusieurs panneaux)</Label>
            </div>
            <Tabs value={props.mode} onValueChange={(v) => props.onModeChange(v === "csv" ? "csv" : "manual")}>
              <TabsList>
                <TabsTrigger value="manual">Manuel</TabsTrigger>
                <TabsTrigger value="csv">CSV</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Époque</span>
              <Tabs value={props.epoch} onValueChange={(v) => props.onEpochChange(v === "JNow" ? "JNow" : "J2000")}>
                <TabsList>
                  <TabsTrigger value="J2000">J2000</TabsTrigger>
                  <TabsTrigger value="JNow">JNow</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {props.mode === "csv" && props.csvUpload}
            {props.isMosaic ? (
              <div className="space-y-4">
                {props.panes.map((pane, index) => (
                  <section key={pane.id ?? index} aria-label={`Panneau ${pane.pane_number}`} className="border-b border-border pb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">P{pane.pane_number}</h3>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Retirer le panneau" aria-label={`Retirer le panneau ${pane.pane_number}`} onClick={() => props.onRemovePane(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CoordinateInputs onCoordinatesChange={(ra, dec) => props.onPaneCoordinatesChange(index, ra, dec)} epoch={props.epoch} ra={pane.ra} dec={pane.dec} rotation={pane.position_angle?.toString() ?? ""}
                      onRaChange={(ra) => props.onPaneCoordinatesChange(index, ra, pane.dec)}
                      onDecChange={(dec) => props.onPaneCoordinatesChange(index, pane.ra, dec)}
                      onRotationChange={(angle) => props.onPaneAngleChange(index, angle)} />
                  </section>
                ))}
                <Button type="button" variant="outline" onClick={props.onAddPane}><Plus className="mr-2 h-4 w-4" />Ajouter un panneau</Button>
              </div>
            ) : (
              <CoordinateInputs epoch={props.epoch} ra={props.ra} dec={props.dec} rotation={props.angle} onRaChange={props.onRaChange} onDecChange={props.onDecChange} onRotationChange={props.onAngleChange} />
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <h3 className="flex items-center gap-2 text-base font-semibold"><MapPin className="h-4 w-4" />Cadrage</h3>
            {props.viewer}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
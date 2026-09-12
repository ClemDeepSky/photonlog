import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Users, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { formatDuration } from "@/lib/duration";
import { Navigate } from "react-router-dom";

interface Acquisition {
  quantity: number;
  acquired: number;
  exposure_duration: number;
}

interface AdminProject {
  id: string;
  name: string;
  status: string;
  created_by: string;
  created_at: string;
  target_object: string | null;
  teams: { name: string } | null;
  project_acquisitions: Acquisition[];
}

interface AdminProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  active: "Actif",
  completed: "Terminé",
  paused: "En pause",
};

const Admin = () => {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profilesRes, projectsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, email, created_at").order("created_at"),
        supabase
          .from("projects")
          .select(
            "id, name, status, created_by, created_at, target_object, teams(name), project_acquisitions(quantity, acquired, exposure_duration)"
          )
          .order("created_at", { ascending: false }),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (projectsRes.error) throw projectsRes.error;
      return {
        profiles: profilesRes.data as AdminProfile[],
        projects: projectsRes.data as unknown as AdminProject[],
      };
    },
    enabled: isAdmin,
  });

  if (adminLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const acquiredSeconds = (acqs: Acquisition[] = []) =>
    acqs.reduce((s, a) => s + a.acquired * Number(a.exposure_duration || 0), 0);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Administration</h1>
            <p className="text-muted-foreground mt-1">Utilisateurs et leurs projets</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-16" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <Card className="border-border/50">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Utilisateurs
                  </p>
                  <p className="text-2xl font-bold">{data?.profiles.length ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" /> Projets
                  </p>
                  <p className="text-2xl font-bold">{data?.projects.length ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground">Temps acquis total</p>
                  <p className="text-2xl font-bold">
                    {formatDuration(
                      (data?.projects ?? []).reduce(
                        (s, p) => s + acquiredSeconds(p.project_acquisitions),
                        0
                      )
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {data?.profiles.map((profile) => {
              const projects = data.projects.filter((p) => p.created_by === profile.id);
              return (
                <Card key={profile.id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="truncate">{profile.username}</span>
                      <span className="text-xs font-normal text-muted-foreground truncate">
                        {profile.email}
                      </span>
                      <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                        {projects.length} projet{projects.length > 1 ? "s" : ""}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {projects.length ? (
                      <div className="divide-y divide-border/40">
                        {projects.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                            <span className="font-medium truncate flex-1">{p.name}</span>
                            <span className="text-xs text-muted-foreground truncate hidden md:block">
                              {p.teams?.name || "Personnel"}
                            </span>
                            <span className="text-xs text-muted-foreground w-24 text-right">
                              {formatDuration(acquiredSeconds(p.project_acquisitions))}
                            </span>
                            <Badge
                              variant={p.status === "active" ? "default" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {statusLabels[p.status] || p.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun projet</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Admin;

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Telescope,
  LayoutDashboard,
  Users,
  Wrench,
  FolderOpen,
  ImagePlus,
  LogOut,
  Menu,
  X,
  Shield,
  CircleHelp,
} from "lucide-react";
import { useState } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const v1NavItems = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/equipment", label: "Matériel et sites", icon: Wrench },
  { to: "/projects", label: "Projets", icon: FolderOpen },
  { to: "/frames", label: "Frames", icon: ImagePlus },
];

const v2NavItems = [
  { to: "/v2/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/v2/projects", label: "Projets", icon: FolderOpen },
  { to: "/equipment", label: "Matériel et sites", icon: Wrench },
  { to: "/teams", label: "Équipes", icon: Users },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useIsAdmin();
  const inV2 = location.pathname.startsWith("/v2");
  const baseNavItems = inV2 ? v2NavItems : v1NavItems;
  const navItems = isAdmin
    ? [...baseNavItems, { to: "/admin", label: "Administration", icon: Shield }]
    : baseNavItems;




  return (
    <div className="min-h-screen bg-cosmic flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/20 bg-card/30">
        <div className="flex items-center gap-2 p-6 border-b border-border/20">
          <Telescope className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-gradient">Photonlog</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 rounded-full px-1.5 py-0.5 leading-none">
            Beta
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-tour={`nav-${item.to.replace("/", "")}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground mb-3 truncate">{user?.email}</p>
          <Link
            to="/guide"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <CircleHelp className="h-3.5 w-3.5" />
            Guide d’utilisation
          </Link>
          <Link
            to="/confidentialite"
            className="block text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            Confidentialité & cookies
          </Link>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-sm border-b border-border/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Telescope className="h-5 w-5 text-primary" />
          <span className="font-bold text-gradient">Photonlog</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 rounded-full px-1 py-0.5 leading-none">
            Beta
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-16">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/guide"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <CircleHelp className="h-4 w-4" />
              Guide d’utilisation
            </Link>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground mt-2" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:pt-0 pt-14 overflow-auto">
        <div className="p-6 md:p-8 w-full">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;

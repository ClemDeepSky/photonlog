import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieBanner from "@/components/CookieBanner";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import { DemoTourProvider } from "@/hooks/useDemoTour";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Equipment from "./pages/Equipment";
import Projects from "./pages/Projects";
import CreateProject from "./pages/CreateProject";
import EditProject from "./pages/EditProject";
import Frames from "./pages/Frames";
import AcceptInvite from "./pages/AcceptInvite";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Guide from "./pages/Guide";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import DashboardV2 from "./pages/v2/DashboardV2";
import ProjectsV2 from "./pages/v2/ProjectsV2";
import ProjectWorkspace from "./pages/v2/ProjectWorkspace";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CookieConsentProvider>
          <DemoTourProvider>
          <Routes>
            <Route path="/" element={<Home />} />
<Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/confidentialite" element={<Privacy />} />
            <Route path="/rgpd" element={<Privacy />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<CreateProject />} />
              <Route path="/projects/:id/edit" element={<EditProject />} />
              <Route path="/frames" element={<Frames />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/account" element={<Account />} />
              {/* V2 — coexiste avec la V1, qui reste inchangée */}
              <Route path="/v2" element={<DashboardV2 />} />
              <Route path="/v2/dashboard" element={<DashboardV2 />} />
              <Route path="/v2/projects" element={<ProjectsV2 />} />
              <Route path="/v2/projects/:id" element={<ProjectWorkspace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieBanner />
          </DemoTourProvider>
          </CookieConsentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const AVATAR_EVENT = "photonlog:avatar-updated";

export const refreshProfileAvatar = () => window.dispatchEvent(new Event(AVATAR_EVENT));

const loadAvatarUrl = async (userId: string) => {
  const { data } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const path = data?.avatar_url ?? null;
  if (!path) return null;
  const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return signed?.signedUrl ?? null;
};

export const useProfileAvatar = () => {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUrl(null);
      return;
    }
    let active = true;
    const run = () => loadAvatarUrl(user.id).then((u) => active && setUrl(u));
    run();
    window.addEventListener(AVATAR_EVENT, run);
    return () => {
      active = false;
      window.removeEventListener(AVATAR_EVENT, run);
    };
  }, [user]);

  return url;
};

export const AccountLink = ({ compact = false, className }: { compact?: boolean; className?: string }) => {
  const { user, signOut } = useAuth();
  const avatarUrl = useProfileAvatar();
  if (!user) return null;
  const initial = (user.email || "?").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mon compte"
        title="Mon compte"
        className={cn(
          "rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/60",
          className
        )}
      >
        <Avatar className={cn("border border-border/60", compact ? "h-6 w-6" : "h-7 w-7")}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="Photo de profil" className="object-cover" />}
          <AvatarFallback className="bg-primary/20 text-[10px] font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/account">
            <UserRound className="mr-2 h-4 w-4" />
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

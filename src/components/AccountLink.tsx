import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { user } = useAuth();
  const avatarUrl = useProfileAvatar();
  if (!user) return null;
  const initial = (user.email || "?").slice(0, 2).toUpperCase();

  return (
    <Link
      to="/account"
      title="Mon compte"
      aria-label="Mon compte"
      className={cn(
        "flex items-center rounded-full border border-border/60 bg-secondary py-1 pl-1 transition-colors hover:border-primary/50",
        compact ? "h-8 w-8 justify-center pr-1" : "pr-3 text-xs text-foreground/80 hover:text-foreground",
        className
      )}
    >
      <Avatar className="h-6 w-6">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="Photo de profil" className="object-cover" />}
        <AvatarFallback className="bg-primary/20 text-[10px] font-semibold text-primary">{initial}</AvatarFallback>
      </Avatar>
      {!compact && <span className="ml-2 max-w-[240px] truncate">{user.email}</span>}
    </Link>
  );
};

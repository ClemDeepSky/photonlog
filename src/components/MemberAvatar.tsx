// Pastille de profil d'un autre membre, partagée par les pages et composants Team.
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const AVATAR_EVENT = "photonlog:avatar-updated";

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
// Une photo remise à jour invalide les URLs signées en cache.
window.addEventListener(AVATAR_EVENT, () => cache.clear());

const loadAvatar = (userId: string): Promise<string | null> => {
  if (cache.has(userId)) return Promise.resolve(cache.get(userId)!);
  const existing = inflight.get(userId);
  if (existing) return existing;
  const p = (async () => {
    const { data } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
    const path = data?.avatar_url ?? null;
    let url: string | null = null;
    if (path) {
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      url = signed?.signedUrl ?? null;
    }
    cache.set(userId, url);
    inflight.delete(userId);
    return url;
  })();
  inflight.set(userId, p);
  return p;
};

/** URLs signées des photos de profil pour une liste d'identifiants utilisateurs. */
export const useMemberAvatars = (userIds: (string | undefined | null)[]): Record<string, string | null> => {
  const key = Array.from(new Set(userIds.filter(Boolean) as string[])).sort().join(",");
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!ids.length) {
      setUrls({});
      return;
    }
    let active = true;
    const refresh = () =>
      Promise.all(ids.map(async (id) => [id, await loadAvatar(id)] as const)).then((pairs) => {
        if (active) setUrls(Object.fromEntries(pairs));
      });
    refresh();
    window.addEventListener(AVATAR_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(AVATAR_EVENT, refresh);
    };
  }, [key]);

  return urls;
};

export const MemberAvatar = ({
  userId,
  avatars,
  fallback = "?",
  className = "h-5 w-5",
}: {
  userId?: string | null;
  avatars: Record<string, string | null>;
  fallback?: string;
  className?: string;
}) => {
  const url = userId ? avatars[userId] : undefined;
  return (
    <Avatar className={cn("border border-border/60 shrink-0", className)}>
      {url && <AvatarImage src={url} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary/20 text-[9px] font-semibold text-primary">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
};

export default MemberAvatar;

CREATE OR REPLACE FUNCTION public.shares_team_with(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members a JOIN public.team_members b ON a.team_id = b.team_id
    WHERE a.user_id = auth.uid() AND b.user_id = _other
  )
$$;
CREATE POLICY "Team members can view avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND public.shares_team_with(((storage.foldername(name))[1])::uuid));
-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true);

-- Allow authenticated users to upload team logos
CREATE POLICY "Team admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-logos');

-- Allow public read access to team logos
CREATE POLICY "Team logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-logos');

-- Allow team admins to update/delete logos
CREATE POLICY "Team admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'team-logos');

CREATE POLICY "Team admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'team-logos');

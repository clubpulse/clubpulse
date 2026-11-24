-- Player highlight videos are private. The browser uploads into the owner's folder;
-- playback uses a short-lived signed URL from the server. Idempotent: safe if the
-- bucket already exists as a public bucket from 20261023000001.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('session-videos', 'session-videos', false, 20971520, ARRAY['video/webm', 'video/mp4'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "session-videos: read" ON storage.objects;
DROP POLICY IF EXISTS "session-videos: read own" ON storage.objects;
CREATE POLICY "session-videos: read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "session-videos: upload own folder" ON storage.objects;
CREATE POLICY "session-videos: upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'session-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "session-videos: update own" ON storage.objects;
CREATE POLICY "session-videos: update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'session-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'session-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "session-videos: delete own" ON storage.objects;
CREATE POLICY "session-videos: delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'session-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

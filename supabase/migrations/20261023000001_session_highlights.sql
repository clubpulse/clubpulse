-- Highlight reels from /analyse sessions. The browser scores each 5-second segment and
-- uploads the top clips to session-videos/{user_id}/{session}/clip-N.{webm|mp4}.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('session-videos', 'session-videos', true, 20971520, ARRAY['video/webm', 'video/mp4'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public bucket: anyone can read via the public URL (needed for sharing). Uploads only into your own folder.
DROP POLICY IF EXISTS "session-videos: upload own folder" ON storage.objects;
CREATE POLICY "session-videos: upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'session-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "session-videos: read" ON storage.objects;
CREATE POLICY "session-videos: read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'session-videos');

-- Columns match the deployed table (read from the PostgREST schema, 2026-10-24). session_date is a
-- required DATE with no default, so inserts must set it. The foreign key, index and policies below
-- aren't visible through that schema and haven't been checked against production.
CREATE TABLE IF NOT EXISTS highlights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date  DATE NOT NULL,
  video_url     TEXT,
  -- [{ url, path, start_sec, end_sec, score, label }], best first
  clips         JSONB,
  top_clip_url  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS highlights_user_idx ON highlights(user_id, created_at DESC);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "highlights: read own" ON highlights;
CREATE POLICY "highlights: read own" ON highlights
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "highlights: insert own" ON highlights;
CREATE POLICY "highlights: insert own" ON highlights
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

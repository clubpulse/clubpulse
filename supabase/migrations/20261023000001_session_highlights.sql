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

CREATE TABLE IF NOT EXISTS highlights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  video_url     TEXT NOT NULL,
  -- [{ url, path, start_sec, end_sec, score, label }], best first
  clips         JSONB NOT NULL CHECK (jsonb_typeof(clips) = 'array'),
  top_clip_url  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS highlights_user_idx ON highlights(user_id, created_at DESC);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "highlights: read own" ON highlights;
CREATE POLICY "highlights: read own" ON highlights
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "highlights: insert own" ON highlights;
CREATE POLICY "highlights: insert own" ON highlights
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

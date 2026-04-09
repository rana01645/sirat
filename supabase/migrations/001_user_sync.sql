-- Supabase migration: Create user_sync table for cross-device progress sync
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)

-- User sync table — stores JSON snapshots of user progress
CREATE TABLE IF NOT EXISTS user_sync (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_sync_user_id ON user_sync(user_id);

-- Row Level Security: users can only access their own data
ALTER TABLE user_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync data"
  ON user_sync FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync data"
  ON user_sync FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync data"
  ON user_sync FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync data"
  ON user_sync FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- MIGRATION: Add Break Timeline
-- Tracks when breaks occurred during practice
-- ============================================

-- Add break_timeline column to store break events
-- Format: [{ "start": 120, "end": 180 }, { "start": 300, "end": 360 }]
-- Times are in seconds from session start
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS break_timeline JSONB DEFAULT '[]'::jsonb;

-- Add index for JSONB queries (optional, for future analytics)
CREATE INDEX IF NOT EXISTS idx_sessions_break_timeline ON public.sessions USING GIN (break_timeline);

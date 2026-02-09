-- ============================================
-- MIGRATION: Add Session Details Fields
-- Adds skills, focus, entropy, and enjoyment tracking
-- ============================================

-- Add new columns to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS skills_practiced TEXT,
ADD COLUMN IF NOT EXISTS break_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS focus TEXT CHECK (focus IN ('clear_goals', 'mid', 'noodling')),
ADD COLUMN IF NOT EXISTS entropy TEXT CHECK (entropy IN ('few_measures', 'in_between', 'whole_piece')),
ADD COLUMN IF NOT EXISTS enjoyment TEXT CHECK (enjoyment IN ('progress', 'ok', 'stuck'));

-- Add indexes for filtering/analytics
CREATE INDEX IF NOT EXISTS idx_sessions_focus ON public.sessions(focus);
CREATE INDEX IF NOT EXISTS idx_sessions_entropy ON public.sessions(entropy);
CREATE INDEX IF NOT EXISTS idx_sessions_enjoyment ON public.sessions(enjoyment);

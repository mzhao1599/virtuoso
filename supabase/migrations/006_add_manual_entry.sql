-- Add is_manual_entry field to sessions table
ALTER TABLE public.sessions
ADD COLUMN is_manual_entry BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering manual vs recorded sessions
CREATE INDEX idx_sessions_is_manual_entry ON public.sessions(is_manual_entry);

-- Add comment for documentation
COMMENT ON COLUMN public.sessions.is_manual_entry IS 'Indicates if session was manually entered (true) or recorded (false)';

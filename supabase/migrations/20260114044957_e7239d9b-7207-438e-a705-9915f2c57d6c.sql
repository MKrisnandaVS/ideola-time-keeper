-- Create time_logs table for tracking work sessions
CREATE TABLE public.time_logs (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  project_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration_minutes FLOAT
);

-- Enable Row Level Security
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to read all time logs
CREATE POLICY "Anyone can view time logs"
ON public.time_logs
FOR SELECT
USING (true);

-- Create policy for anyone to insert time logs
CREATE POLICY "Anyone can insert time logs"
ON public.time_logs
FOR INSERT
WITH CHECK (true);

-- Create policy for anyone to update time logs
CREATE POLICY "Anyone can update time logs"
ON public.time_logs
FOR UPDATE
USING (true);
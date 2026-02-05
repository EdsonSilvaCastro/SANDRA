-- Fix tasks table - Add all missing columns
-- Run this in Supabase SQL Editor

-- Add unit_price column (already identified)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;

-- Add assigned_worker_id column (app uses this instead of assigned_to)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_worker_id TEXT;

-- Add priority column (seen in the PATCH request)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Add progress column (seen in the PATCH request)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Add dependencies column (seen in the PATCH request)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dependencies TEXT[];

-- Add notes column (seen in the PATCH request)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add created_at if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Verify all columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

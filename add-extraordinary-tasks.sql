-- Add is_extraordinary column to tasks table
-- This migration adds support for marking tasks as extraordinary

-- Add the is_extraordinary column to the tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_extraordinary boolean DEFAULT false;

-- Add an index for better query performance when filtering extraordinary tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_extraordinary ON tasks(is_extraordinary);

-- Add comment to document the column
COMMENT ON COLUMN tasks.is_extraordinary IS 'Flag to indicate if this is an extraordinary task that requires special handling or pricing';
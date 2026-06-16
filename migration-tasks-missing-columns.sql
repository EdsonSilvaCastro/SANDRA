-- Migration: Add missing columns to tasks table
-- These columns were added to the frontend but never migrated to the DB.
-- Run this in Supabase SQL Editor.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_extraordinary BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS material_assignments JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS supplier_assignments JSONB DEFAULT '[]';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

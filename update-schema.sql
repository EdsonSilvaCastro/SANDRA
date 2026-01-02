-- Complete Database Schema Update for SANDRA App
-- Run this in Supabase SQL Editor to add ALL missing columns

-- ============================================
-- PROJECTS TABLE
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS collaborator_ids UUID[] DEFAULT '{}';

-- ============================================
-- MATERIALS TABLE
-- ============================================
ALTER TABLE materials ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- MATERIAL_ORDERS TABLE
-- ============================================
ALTER TABLE material_orders ADD COLUMN IF NOT EXISTS supplier TEXT;

-- ============================================
-- WORKERS TABLE
-- ============================================
ALTER TABLE workers ADD COLUMN IF NOT EXISTS specialty TEXT;

-- ============================================
-- TASKS TABLE
-- ============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_volume NUMERIC;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_volume NUMERIC;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS volume_unit TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS photo_ids TEXT[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on TEXT[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_value NUMERIC;

-- ============================================
-- TIME_LOGS TABLE
-- ============================================
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- BUDGET_ITEMS TABLE
-- ============================================
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS allocated NUMERIC DEFAULT 0;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS date DATE;

-- ============================================
-- PHOTOS TABLE
-- ============================================
ALTER TABLE photos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE photos ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP DEFAULT NOW();

-- ============================================
-- CRM_CONTACTS TABLE
-- ============================================
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS secondary_contact_name TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS secondary_contact_phone TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS secondary_contact_email TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS last_contact_date DATE;

-- ============================================
-- REPORTS TABLE
-- ============================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS generated_by TEXT;

-- ============================================
-- Verify all columns were added successfully
-- ============================================
SELECT 
    table_name,
    count(*) as column_count
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('projects', 'materials', 'material_orders', 'workers', 'tasks', 'time_logs', 'budget_items', 'photos', 'crm_contacts', 'reports')
GROUP BY table_name
ORDER BY table_name;

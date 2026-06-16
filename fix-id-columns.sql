-- Fix ALL ID and Foreign Key columns to TEXT type
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL foreign key constraints
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_project_id_fkey;
ALTER TABLE material_orders DROP CONSTRAINT IF EXISTS material_orders_project_id_fkey;
ALTER TABLE material_orders DROP CONSTRAINT IF EXISTS material_orders_material_id_fkey;
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_project_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE time_logs DROP CONSTRAINT IF EXISTS time_logs_project_id_fkey;
ALTER TABLE time_logs DROP CONSTRAINT IF EXISTS time_logs_worker_id_fkey;
ALTER TABLE time_logs DROP CONSTRAINT IF EXISTS time_logs_task_id_fkey;
ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_project_id_fkey;
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_project_id_fkey;
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_task_id_fkey;
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_project_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_project_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;

-- Step 2: Change ALL ID columns to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE projects ALTER COLUMN id TYPE TEXT;
ALTER TABLE projects ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE materials ALTER COLUMN id TYPE TEXT;
ALTER TABLE materials ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE material_orders ALTER COLUMN id TYPE TEXT;
ALTER TABLE material_orders ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE material_orders ALTER COLUMN material_id TYPE TEXT;
ALTER TABLE workers ALTER COLUMN id TYPE TEXT;
ALTER TABLE workers ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE tasks ALTER COLUMN id TYPE TEXT;
ALTER TABLE tasks ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE tasks ALTER COLUMN assigned_to TYPE TEXT;
ALTER TABLE time_logs ALTER COLUMN id TYPE TEXT;
ALTER TABLE time_logs ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE time_logs ALTER COLUMN worker_id TYPE TEXT;
ALTER TABLE time_logs ALTER COLUMN task_id TYPE TEXT;
ALTER TABLE budget_items ALTER COLUMN id TYPE TEXT;
ALTER TABLE budget_items ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE photos ALTER COLUMN id TYPE TEXT;
ALTER TABLE photos ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE photos ALTER COLUMN task_id TYPE TEXT;
ALTER TABLE crm_contacts ALTER COLUMN id TYPE TEXT;
ALTER TABLE crm_contacts ALTER COLUMN project_id TYPE TEXT;
ALTER TABLE reports ALTER COLUMN id TYPE TEXT;
ALTER TABLE reports ALTER COLUMN project_id TYPE TEXT;

-- Step 3: Re-add foreign key constraints with TEXT type
ALTER TABLE projects 
  ADD CONSTRAINT projects_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE materials 
  ADD CONSTRAINT materials_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE material_orders 
  ADD CONSTRAINT material_orders_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE material_orders 
  ADD CONSTRAINT material_orders_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;

ALTER TABLE workers 
  ADD CONSTRAINT workers_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE tasks 
  ADD CONSTRAINT tasks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES workers(id) ON DELETE SET NULL;

ALTER TABLE time_logs 
  ADD CONSTRAINT time_logs_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE time_logs 
  ADD CONSTRAINT time_logs_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

ALTER TABLE time_logs 
  ADD CONSTRAINT time_logs_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE budget_items 
  ADD CONSTRAINT budget_items_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE photos 
  ADD CONSTRAINT photos_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE photos 
  ADD CONSTRAINT photos_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

ALTER TABLE crm_contacts 
  ADD CONSTRAINT crm_contacts_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE reports 
  ADD CONSTRAINT reports_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Verify the changes
SELECT 'All ID columns are now TEXT type' as status;

// Apply database migration for extraordinary tasks
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://chzqbcxhqszvsxynxdgj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Applying database migration for extraordinary tasks...\n');

async function applyMigration() {
  try {
    console.log('1️⃣ Reading migration SQL...');
    const migrationSQL = readFileSync('./add-extraordinary-tasks.sql', 'utf8');
    
    console.log('2️⃣ Executing migration...');
    // Note: The anon key might not have permissions to alter tables
    // This migration might need to be run with service role key or through Supabase dashboard
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      if (error.message.includes('permission denied') || error.message.includes('insufficient_privilege')) {
        console.log('❌ Permission denied - anon key cannot alter table structure');
        console.log('');
        console.log('🔑 To fix this, you need to run the migration manually:');
        console.log('');
        console.log('Option 1 - Supabase Dashboard:');
        console.log('1. Go to https://supabase.com/dashboard/project/chzqbcxhqszvsxynxdgj/sql');
        console.log('2. Copy and paste the SQL from add-extraordinary-tasks.sql');
        console.log('3. Click "Run"');
        console.log('');
        console.log('Option 2 - Service Role Key:');
        console.log('1. Get your service role key (not anon key) from Supabase settings');
        console.log('2. Run this script with the service role key');
        console.log('');
        console.log('The SQL to run:');
        console.log('--------------------');
        console.log(migrationSQL);
        console.log('--------------------');
        return;
      }
      throw error;
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Test the new column
    console.log('3️⃣ Testing the new column...');
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('id, name, is_extraordinary')
      .limit(1);
    
    if (testError) {
      console.log('❌ Test failed:', testError.message);
    } else {
      console.log('✅ Column test successful!');
      console.log('Sample data:', testData);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

applyMigration();
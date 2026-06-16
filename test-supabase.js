import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://chzqbcxhqszvsxynxdgj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing Supabase connection...\n');

// Test 1: Check connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\n📝 Make sure you have created the database tables using the SQL script provided.');
      return false;
    }
    
    console.log('✅ Connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

// Test 2: Check if tables exist
async function checkTables() {
  const tables = ['users', 'projects', 'materials', 'workers', 'tasks'];
  console.log('\n🔍 Checking tables...');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Table "${table}" - ${error.message}`);
      } else {
        console.log(`✅ Table "${table}" exists`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}" - ${err.message}`);
    }
  }
}

// Test 3: Check admin user
async function checkAdminUser() {
  console.log('\n🔍 Checking admin user...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@constructpro.com')
      .single();
    
    if (error) {
      console.log('❌ Admin user not found');
      console.log('💡 You may need to run the SQL script to create the default admin user');
    } else {
      console.log('✅ Admin user exists:', data.email);
    }
  } catch (err) {
    console.log('❌ Error checking admin user:', err.message);
  }
}

// Run all tests
async function runTests() {
  const connected = await testConnection();
  
  if (connected) {
    await checkTables();
    await checkAdminUser();
    console.log('\n✅ All tests completed!');
  } else {
    console.log('\n❌ Connection test failed. Please check your credentials and network connection.');
  }
}

runTests();

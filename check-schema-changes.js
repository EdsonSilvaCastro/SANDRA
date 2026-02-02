// Automated schema change detector for SANDRA
// Compares TypeScript interfaces with database schema to catch missing columns

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://chzqbcxhqszvsxynxdgj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking for Database Schema Changes...\n');

// Parse TypeScript types from types.ts
function parseTypeScriptInterfaces() {
    console.log('📖 Reading TypeScript interfaces...');
    const typesContent = readFileSync('./types.ts', 'utf8');
    
    const interfaces = {};
    
    // Extract interface definitions
    const interfaceRegex = /export interface (\w+) \{([\s\S]*?)\}/g;
    let match;
    
    while ((match = interfaceRegex.exec(typesContent)) !== null) {
        const interfaceName = match[1];
        const interfaceBody = match[2];
        
        // Extract properties
        const properties = [];
        const propRegex = /(\w+)(\?)?: ([^;]+);/g;
        let propMatch;
        
        while ((propMatch = propRegex.exec(interfaceBody)) !== null) {
            const propName = propMatch[1];
            const isOptional = propMatch[2] === '?';
            const propType = propMatch[3].trim();
            
            properties.push({
                name: propName,
                optional: isOptional,
                type: propType
            });
        }
        
        interfaces[interfaceName] = properties;
    }
    
    return interfaces;
}

// Convert camelCase to snake_case
function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Check specific table against interface
async function checkTableSchema(tableName, interfaceName, expectedProperties) {
    console.log(`\n🔍 Checking ${tableName} table...`);
    
    try {
        // Get table schema info by trying to select from it
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (error && error.message.includes('does not exist')) {
            console.log(`❌ Table "${tableName}" does not exist!`);
            return { tableName, issues: [`Table "${tableName}" missing`] };
        }
        
        const issues = [];
        
        // For each property in the interface, check if it exists in database
        for (const prop of expectedProperties) {
            const dbColumnName = toSnakeCase(prop.name);
            
            // Skip non-database fields
            if (['id'].includes(prop.name)) continue;
            
            // Try to select this specific column
            const { error: columnError } = await supabase
                .from(tableName)
                .select(dbColumnName)
                .limit(1);
            
            if (columnError && columnError.message.includes('Could not find')) {
                issues.push(`Column "${dbColumnName}" (${prop.name}) missing`);
            }
        }
        
        if (issues.length === 0) {
            console.log(`✅ Table "${tableName}" schema matches interface "${interfaceName}"`);
        } else {
            console.log(`❌ Table "${tableName}" has ${issues.length} issue(s):`);
            issues.forEach(issue => console.log(`   - ${issue}`));
        }
        
        return { tableName, issues };
        
    } catch (error) {
        console.log(`❌ Error checking ${tableName}:`, error.message);
        return { tableName, issues: [`Error: ${error.message}`] };
    }
}

async function main() {
    const interfaces = parseTypeScriptInterfaces();
    
    console.log('Found interfaces:', Object.keys(interfaces).join(', '));
    
    // Define table mappings
    const tableMappings = {
        'Task': 'tasks',
        'Material': 'materials',
        'Worker': 'workers',
        'MaterialOrder': 'material_orders',
        'TimeLog': 'time_logs',
        'BudgetCategory': 'budget_items',
        'Expense': 'expenses',
        'Photo': 'photos',
        'Client': 'clients',
        'Interaction': 'interactions'
    };
    
    const allIssues = [];
    
    for (const [interfaceName, tableName] of Object.entries(tableMappings)) {
        if (interfaces[interfaceName]) {
            const result = await checkTableSchema(tableName, interfaceName, interfaces[interfaceName]);
            if (result.issues.length > 0) {
                allIssues.push(result);
            }
        } else {
            console.log(`⚠️  Interface "${interfaceName}" not found in types.ts`);
        }
    }
    
    // Summary
    console.log('\n📊 SCHEMA CHECK SUMMARY');
    console.log('='.repeat(50));
    
    if (allIssues.length === 0) {
        console.log('✅ All database tables match TypeScript interfaces!');
        console.log('🎉 No migration needed.');
    } else {
        console.log(`❌ Found ${allIssues.length} table(s) with schema issues:\n`);
        
        allIssues.forEach(({ tableName, issues }) => {
            console.log(`🔧 ${tableName.toUpperCase()}:`);
            issues.forEach(issue => console.log(`   - ${issue}`));
            console.log('');
        });
        
        console.log('💡 NEXT STEPS:');
        console.log('1. Update update-schema.sql with missing columns');
        console.log('2. Run the migration in Supabase dashboard');
        console.log('3. Re-run this script to verify fixes');
        console.log('4. Deploy frontend changes');
        
        // Generate migration suggestions
        console.log('\n🔧 SUGGESTED MIGRATION SQL:');
        console.log('-'.repeat(40));
        allIssues.forEach(({ tableName, issues }) => {
            issues.forEach(issue => {
                if (issue.includes('Column') && issue.includes('missing')) {
                    const columnMatch = issue.match(/Column "([^"]+)"/);
                    if (columnMatch) {
                        const columnName = columnMatch[1];
                        console.log(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} TEXT;`);
                    }
                }
            });
        });
    }
}

main().catch(console.error);
#!/bin/bash

# Pre-deployment schema verification script
# Run this before every merge/release to catch database schema issues

echo "🚀 SANDRA Pre-Deployment Schema Check"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Step 1: Checking for recent changes in types.ts...${NC}"
if git diff --name-only HEAD~1 | grep -q "types.ts"; then
    echo -e "${YELLOW}⚠️  types.ts was modified in recent commits!${NC}"
    echo "Recent changes:"
    git diff HEAD~1 types.ts | grep "^+" | head -10
    echo ""
    echo -e "${RED}🚨 ALERT: Database schema might need updates!${NC}"
    SCHEMA_CHANGED=true
else
    echo -e "${GREEN}✅ No recent changes in types.ts${NC}"
    SCHEMA_CHANGED=false
fi

echo ""
echo -e "${BLUE}🔍 Step 2: Checking for component changes that might affect database...${NC}"

# Check for new database-related changes in components
if git diff --name-only HEAD~1 | grep -E "(components/|contexts/)" | xargs grep -l "addItem\|updateItem\|deleteItem\|supabase" 2>/dev/null | wc -l | grep -qv "^0$"; then
    echo -e "${YELLOW}⚠️  Database operations were modified in components!${NC}"
    echo "Files with database changes:"
    git diff --name-only HEAD~1 | grep -E "(components/|contexts/)" | xargs grep -l "addItem\|updateItem\|deleteItem\|supabase" 2>/dev/null
    echo ""
    SCHEMA_CHANGED=true
else
    echo -e "${GREEN}✅ No significant database operation changes in components${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Step 3: Running automated schema compatibility check...${NC}"

# Run the schema checker
if node check-schema-changes.js; then
    SCHEMA_CHECK_PASSED=true
else
    SCHEMA_CHECK_PASSED=false
fi

echo ""
echo -e "${BLUE}🔍 Step 4: Testing database connection...${NC}"

# Test database connection
if node test-production-db.js | grep -q "All database tests completed"; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    DB_CONNECTION_OK=true
else
    echo -e "${RED}❌ Database connection issues detected${NC}"
    DB_CONNECTION_OK=false
fi

echo ""
echo "📊 DEPLOYMENT READINESS SUMMARY"
echo "==============================="

if [ "$SCHEMA_CHANGED" = true ]; then
    echo -e "${YELLOW}⚠️  Schema changes detected${NC}"
    DEPLOYMENT_SAFE=false
fi

if [ "$SCHEMA_CHECK_PASSED" = false ]; then
    echo -e "${RED}❌ Schema compatibility issues found${NC}"
    DEPLOYMENT_SAFE=false
fi

if [ "$DB_CONNECTION_OK" = false ]; then
    echo -e "${RED}❌ Database connection problems${NC}"
    DEPLOYMENT_SAFE=false
fi

if [ "$DEPLOYMENT_SAFE" = false ]; then
    echo ""
    echo -e "${RED}🚨 DEPLOYMENT NOT RECOMMENDED${NC}"
    echo ""
    echo "Required actions before deployment:"
    echo "1. Review and apply any missing database migrations"
    echo "2. Update update-schema.sql with new columns"
    echo "3. Test migrations in Supabase dashboard"
    echo "4. Re-run this script to verify fixes"
    echo ""
    echo "📋 Quick reference:"
    echo "- Supabase Dashboard: https://supabase.com/dashboard/project/chzqbcxhqszvsxynxdgj/sql"
    echo "- Migration file: ./update-schema.sql"
    echo "- Test script: ./test-production-db.js"
    exit 1
else
    echo -e "${GREEN}✅ DEPLOYMENT READY${NC}"
    echo ""
    echo "🎉 All checks passed! Safe to deploy."
    echo ""
    echo "Next steps:"
    echo "1. Merge your changes"
    echo "2. Deploy to production"
    echo "3. Monitor application logs"
    exit 0
fi
# 🚀 SANDRA Deployment Checklist

## Pre-Merge Checklist

### 🔍 Code Review Phase
- [ ] **Database Schema Changes**: Check if any new fields were added to TypeScript interfaces in `types.ts`
- [ ] **Component Changes**: Look for new form fields, database operations, or API calls in components
- [ ] **Context Changes**: Review `ProjectContext.tsx` for new data fields or table mappings
- [ ] **Constants**: Check `constants.tsx` for new initial data structures

### 🗄️ Database Schema Verification
- [ ] Compare current `types.ts` with database schema
- [ ] Check if any new fields in interfaces need corresponding database columns
- [ ] Verify that `TABLE_MAP` in ProjectContext matches actual database table names
- [ ] Look for new `addItem`, `updateItem`, or `deleteItem` calls with new fields

### 📋 Common Schema Change Indicators
- [ ] New properties in interfaces (`Material`, `Task`, `Worker`, etc.)
- [ ] New form fields in components (input, checkbox, select)
- [ ] New API calls or Supabase queries
- [ ] New filter or search functionality
- [ ] New import/export columns

## Database Migration Process

### 🔧 Before Deployment
1. **Generate Migration Script**: Update `update-schema.sql` with any new columns
2. **Test Migration**: Run migration on a test database first
3. **Backup**: Ensure production database is backed up
4. **Document Changes**: Update migration documentation

### 🚀 During Deployment
1. **Run Migration**: Execute schema updates before deploying frontend
2. **Verify Columns**: Check that all new columns exist
3. **Test CRUD Operations**: Verify create, read, update, delete operations work
4. **Test Frontend**: Confirm UI works with new schema

### ✅ After Deployment
1. **Monitor Errors**: Check for database-related errors in logs
2. **Test User Flows**: Verify all user actions work correctly
3. **Update Documentation**: Document the changes made

## Automated Schema Checking

### 🤖 Use These Scripts
- `check-schema-changes.js` - Compares TypeScript types with database
- `generate-migration.js` - Auto-generates migration scripts
- `test-database-compatibility.js` - Tests if frontend matches database

### 🔍 Manual Verification Commands
```bash
# Test database connection and schema
node test-production-db.js

# Check for missing columns
node check-schema-changes.js

# Test specific functionality
node test-extraordinary-fix.js
```

## Emergency Rollback Plan

### 🚨 If Migration Fails
1. **Revert Database**: Restore from backup
2. **Rollback Deployment**: Revert to previous frontend version
3. **Fix Issues**: Correct migration script
4. **Re-deploy**: Run corrected migration and deployment

### 📞 Contact Information
- **Database Access**: Supabase Dashboard
- **Deployment**: AWS S3 + CloudFront
- **Monitoring**: Check GitHub Actions and CloudWatch logs

---

## Recent Schema Issues Resolved
- ✅ `is_extraordinary` column added to tasks table (Feb 2, 2026)
- ✅ Full schema update script created and maintained

**Remember**: Always check `types.ts` changes against actual database schema!
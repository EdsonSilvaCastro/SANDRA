<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ixv-nFNBw_ktkdVu6NUAw-VcuOpaSKYy

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 🗄️ Database Schema Management

### ⚠️ CRITICAL: Database Schema Synchronization

Before every deployment, ensure database schema matches TypeScript interfaces:

```bash
# Check for schema changes (run before every deployment)
./pre-deployment-check.sh

# Check specific schema compatibility
node check-schema-changes.js

# Test database connectivity
node test-production-db.js
```

### Database Migration Process

1. **Before Code Changes**: If adding new TypeScript interface properties, update `update-schema.sql`
2. **Pre-Commit**: Git hook will warn about potential schema changes
3. **Pre-Deployment**: Automated schema check in CI/CD pipeline
4. **Migration**: Run SQL updates in Supabase dashboard before frontend deployment

### Schema Files
- `types.ts` - TypeScript interface definitions
- `update-schema.sql` - Complete database migration script
- `check-schema-changes.js` - Automated schema compatibility checker
- `DEPLOYMENT-CHECKLIST.md` - Detailed deployment process

**⚠️ Always run database migrations BEFORE deploying frontend changes!**

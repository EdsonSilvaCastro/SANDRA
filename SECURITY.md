# Security Configuration for Production

## 1. CloudFront Security Headers

Add these headers to CloudFront Response Headers Policy:

### Create Response Headers Policy:
1. Go to CloudFront Console → **Policies** → **Response headers**
2. Click **"Create response headers policy"**
3. Name: `sandra-security-headers`

### Headers to Add:

**Strict-Transport-Security:**
```
max-age=31536000; includeSubDomains; preload
```

**X-Content-Type-Options:**
```
nosniff
```

**X-Frame-Options:**
```
DENY
```

**X-XSS-Protection:**
```
1; mode=block
```

**Referrer-Policy:**
```
strict-origin-when-cross-origin
```

**Permissions-Policy:**
```
camera=(), microphone=(), geolocation=()
```

**Content-Security-Policy:**
```
default-src 'self'; 
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://aistudiocdn.com https://esm.sh; 
style-src 'self' 'unsafe-inline'; 
img-src 'self' data: https:; 
connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;
font-src 'self' data:;
```

### Apply to CloudFront Distribution:
1. Edit your CloudFront distribution
2. Go to **Behaviors** tab
3. Edit the default behavior
4. Under **Response headers policy**, select `sandra-security-headers`
5. Save changes

---

## 2. Supabase Security (Row Level Security)

### Enable RLS on All Tables:
```sql
-- Already done in setup, but verify:
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables
```

### Tighten RLS Policies for Production:

Replace the "Allow all" policies with proper security:

```sql
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all users" ON users;
DROP POLICY IF EXISTS "Allow all projects" ON projects;
-- ... drop all "Allow all" policies

-- Users can read their own data
CREATE POLICY "Users can view their own data" 
ON users FOR SELECT 
USING (auth.uid()::text = id::text);

-- Users can update their own data
CREATE POLICY "Users can update their own data" 
ON users FOR UPDATE 
USING (auth.uid()::text = id::text);

-- Projects: Users can only see projects they have access to
-- You'll need a user_projects junction table for proper multi-tenancy
CREATE POLICY "Users can view their projects" 
ON projects FOR SELECT 
USING (true);  -- Customize based on your auth logic

-- Materials: Can only access materials from their projects
CREATE POLICY "Users can view materials from their projects" 
ON materials FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM projects 
    -- Add your project access logic here
  )
);

-- Similar policies for all other tables...
```

### Change Default Admin Password:
```sql
-- IMPORTANT: Change this immediately after first deployment!
UPDATE users 
SET password = 'your-new-secure-password' 
WHERE email = 'admin@constructpro.com';
```

---

## 3. Environment Variables Security

### Never Commit These:
```bash
# Add to .gitignore (already there, but verify)
.env.local
.env.production
.env
```

### Use Different Keys for Production:
- **Supabase**: Create separate production project
- **Gemini API**: Use separate API key with rate limits
- **Never use** development keys in production

---

## 4. AWS Security Best Practices

### S3 Bucket Security:
```bash
# Enable versioning (for rollback)
aws s3api put-bucket-versioning \
  --bucket sandra-production \
  --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket sandra-production \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public ACLs (CloudFront will access via OAC)
aws s3api put-public-access-block \
  --bucket sandra-production \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### CloudFront Security:
- Enable **AWS WAF** (Web Application Firewall) - ~$5/month + rules cost
- Add rate limiting rules
- Block common attack patterns
- Geo-restriction if needed

### IAM Security:
- Use least privilege policies
- Rotate access keys every 90 days
- Enable MFA on AWS root account
- Use IAM roles instead of keys where possible

---

## 5. Application Security Checklist

- [ ] All API keys are production-specific
- [ ] Admin password changed from default
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured
- [ ] Supabase RLS policies tightened
- [ ] S3 bucket encryption enabled
- [ ] CloudFront OAC (Origin Access Control) configured
- [ ] AWS WAF enabled (optional but recommended)
- [ ] Regular dependency updates scheduled
- [ ] Error messages don't expose sensitive info
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Supabase handles this)
- [ ] XSS protection in place

---

## 6. Monitoring & Alerts

### AWS CloudWatch Alarms:
```bash
# Create alarm for high 4xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name sandra-high-4xx-errors \
  --alarm-description "Alert when 4xx errors exceed threshold" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Create alarm for high 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name sandra-high-5xx-errors \
  --alarm-description "Alert when 5xx errors exceed threshold" \
  --metric-name 5xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Supabase Monitoring:
- Check database usage in Supabase dashboard
- Set up email alerts for unusual activity
- Monitor API request counts
- Review logs regularly

---

## 7. Backup Strategy

### Supabase Backups:
- Supabase automatically backs up daily (Pro plan)
- For free tier: Set up manual backups

```bash
# Manual backup (requires PostgreSQL client)
pg_dump "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" > backup.sql

# Or use Supabase CLI
supabase db dump > backup.sql
```

### S3 Versioning:
- Already enabled above
- Can recover deleted/modified files
- Keep previous versions for 30 days

---

## 8. Incident Response Plan

### If Site is Down:
1. Check CloudFront status
2. Check S3 bucket accessibility
3. Verify Supabase status
4. Check AWS Service Health Dashboard
5. Rollback to previous version if needed

### If Compromised:
1. Immediately rotate all API keys
2. Change all passwords
3. Review Supabase logs for unauthorized access
4. Check AWS CloudTrail for suspicious activity
5. Notify users if data breach occurred

---

## 9. Regular Maintenance Tasks

### Weekly:
- [ ] Review CloudWatch logs for errors
- [ ] Check Supabase usage and performance

### Monthly:
- [ ] Update npm dependencies: `npm update`
- [ ] Review and update security policies
- [ ] Check AWS costs
- [ ] Verify backups are working

### Quarterly:
- [ ] Rotate AWS IAM access keys
- [ ] Security audit
- [ ] Load testing
- [ ] Review and tighten RLS policies

---

## 10. Compliance (If Applicable)

### GDPR Requirements:
- [ ] Privacy policy published
- [ ] Cookie consent implemented
- [ ] Data export functionality
- [ ] Data deletion functionality
- [ ] Data processing agreement with Supabase

### HIPAA/PCI-DSS:
- Requires additional AWS configurations
- Supabase Pro plan with HIPAA compliance
- Additional encryption requirements

---

## Security Contacts

- **AWS Security**: https://aws.amazon.com/security/
- **Supabase Security**: security@supabase.io
- **Report Vulnerabilities**: Set up security@yourdomain.com

Remember: Security is ongoing, not a one-time setup!

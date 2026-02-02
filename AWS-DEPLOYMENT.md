# SANDRA - AWS Deployment Guide

## Prerequisites
- AWS Account with billing enabled
- AWS CLI installed and configured
- Domain name (optional but recommended)
- Node.js 18+ installed locally

## Architecture
```
Users → Route 53 (DNS) → CloudFront (CDN) → S3 Bucket (Static Files)
                                          ↓
                                    Supabase Database
```

## Estimated Costs (Monthly)
- **S3 Storage**: ~$0.50 (for 5GB storage)
- **CloudFront**: ~$1-10 (depending on traffic)
- **Route 53**: $0.50 per hosted zone + $0.40 per million queries
- **Total**: ~$2-15/month for small to medium traffic

---

## Deployment Steps

### 1. Build the Application

```bash
# Make build script executable
chmod +x build-prod.sh

# Run production build
./build-prod.sh
```

This creates a `dist` folder with optimized production files.

### 2. Set Up AWS S3 Bucket

#### Via AWS Console:
1. Go to [S3 Console](https://console.aws.amazon.com/s3/)
2. Click **"Create bucket"**
3. **Bucket name**: `sandra-production` (must be globally unique)
4. **Region**: Choose closest to your users (e.g., `us-east-1`)
5. **Uncheck** "Block all public access"
6. Acknowledge the warning
7. Click **"Create bucket"**

#### Enable Static Website Hosting:
1. Open your bucket → **Properties** tab
2. Scroll to **"Static website hosting"**
3. Click **"Edit"** → **"Enable"**
4. **Index document**: `index.html`
5. **Error document**: `index.html` (for SPA routing)
6. Click **"Save changes"**

#### Set Bucket Policy:
1. Go to **Permissions** tab → **Bucket Policy**
2. Add this policy (replace `sandra-production` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sandra-production/*"
    }
  ]
}
```

### 3. Upload Files to S3

#### Option A: AWS Console
1. Open your bucket
2. Click **"Upload"**
3. Drag and drop all files from the `dist` folder
4. Click **"Upload"**

#### Option B: AWS CLI (Faster, recommended)
```bash
# Install AWS CLI if not already installed
# macOS: brew install awscli
# Configure AWS CLI (first time only)
aws configure
# Enter your AWS Access Key ID, Secret Key, and region

# Upload files
aws s3 sync dist/ s3://sandra-production --delete

# Verify upload
aws s3 ls s3://sandra-production/
```

Your site is now accessible at: `http://sandra-production.s3-website-us-east-1.amazonaws.com`

### 4. Set Up CloudFront CDN (For HTTPS & Performance)

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click **"Create distribution"**

**Configuration:**
- **Origin domain**: Select your S3 bucket from dropdown
- **Origin access**: Select "Origin access control settings (recommended)"
  - Click "Create control setting" → Create
- **Viewer protocol policy**: "Redirect HTTP to HTTPS"
- **Allowed HTTP methods**: GET, HEAD, OPTIONS
- **Cache policy**: "CachingOptimized"
- **Price class**: Choose based on your users' locations
- **Alternate domain name (CNAME)**: Your custom domain (if you have one)
- **Custom SSL certificate**: Request certificate (if using custom domain)
- **Default root object**: `index.html`

3. Click **"Create distribution"**
4. Wait 10-15 minutes for deployment
5. Copy the **Distribution domain name** (e.g., `d123456abcdef.cloudfront.net`)

#### Update S3 Bucket Policy for CloudFront:
CloudFront will provide a policy to add to your S3 bucket. Copy and add it to your bucket's policy.

### 5. Configure Custom Domain (Optional)

#### Get SSL Certificate:
1. Go to [AWS Certificate Manager](https://console.aws.amazon.com/acm/)
2. **Important**: Switch to **us-east-1** region (required for CloudFront)
3. Click **"Request certificate"**
4. Choose **"Request a public certificate"**
5. Enter your domain: `sandra.yourdomain.com` and `*.yourdomain.com`
6. Validation method: **DNS validation**
7. Add the CNAME records to your domain's DNS (provided by ACM)
8. Wait for validation (5-30 minutes)

#### Set Up Route 53:
1. Go to [Route 53 Console](https://console.aws.amazon.com/route53/)
2. Click **"Create hosted zone"**
3. Enter your domain name
4. Click **"Create hosted zone"**
5. Note the **4 nameservers** provided
6. Update your domain registrar to use these nameservers

#### Create DNS Record:
1. In your hosted zone, click **"Create record"**
2. **Record name**: `sandra` (or leave empty for root domain)
3. **Record type**: A
4. **Alias**: Yes
5. **Route traffic to**: CloudFront distribution
6. Select your distribution from dropdown
7. Click **"Create records"**

### 6. Configure SPA Routing (Important!)

CloudFront needs to handle React Router properly:

1. In CloudFront distribution → **Error pages** tab
2. Click **"Create custom error response"**
3. **HTTP error code**: 403
4. **Customize error response**: Yes
5. **Response page path**: `/index.html`
6. **HTTP response code**: 200
7. Click **"Create"**

Repeat for error code 404.

### 7. Deploy Updates

```bash
# Build new version
npm run build

# Upload to S3
aws s3 sync dist/ s3://sandra-production --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Environment Variables in Production

Create `.env.production`:
```bash
VITE_SUPABASE_URL=https://your-prod-supabase-url.supabase.co
VITE_SUPABASE_KEY=your-prod-anon-key
GEMINI_API_KEY=your-prod-gemini-key
```

**Important**: These are embedded in the build, so keep the anon key (it's designed to be public).

---

## Security Checklist

- [ ] Supabase Row Level Security (RLS) policies enabled
- [ ] HTTPS enforced via CloudFront
- [ ] S3 bucket has proper access controls
- [ ] API keys are production-specific
- [ ] CloudFront has Web Application Firewall (WAF) configured
- [ ] Strong admin password set in production database

---

## Monitoring & Maintenance

### CloudWatch Monitoring:
- CloudFront dashboard shows traffic, errors, cache hits
- Set up alarms for high error rates

### Cost Monitoring:
- Enable AWS Cost Explorer
- Set up billing alerts

### Regular Tasks:
- Monitor Supabase usage and logs
- Review CloudFront cache performance
- Update dependencies monthly
- Backup database regularly (Supabase does this automatically)

---

## Rollback Process

If something goes wrong:
```bash
# Revert to previous version in S3
aws s3 sync s3://sandra-production-backup/ s3://sandra-production/

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Alternative: AWS Amplify (Easier Setup)

For simpler deployment with automatic CI/CD:

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Connect your GitHub repository
4. Amplify auto-detects Vite configuration
5. Add environment variables in Amplify Console
6. Deploy!

**Pros**: Automatic deployments on git push, built-in CI/CD, preview environments
**Cons**: Slightly more expensive (~$15-30/month)

---

## Support & Troubleshooting

### Common Issues:

**404 errors on refresh:**
- Ensure error pages redirect to `/index.html` with 200 status

**CSS/JS not loading:**
- Check S3 bucket policy allows public read
- Verify CORS settings if needed

**Environment variables not working:**
- Rebuild application after changing `.env.production`
- Vite embeds env vars at build time

**Slow initial load:**
- Enable CloudFront compression
- Check bundle size: `npm run build -- --report`

---

## Next Steps After Deployment

1. Set up monitoring and alerts
2. Configure automated backups
3. Implement CI/CD pipeline
4. Add error tracking (Sentry)
5. Set up staging environment
6. Document for your team

Your production URL will be: `https://sandra.yourdomain.com` or your CloudFront domain.

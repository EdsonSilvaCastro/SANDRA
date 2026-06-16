# Quick Start Guide - AWS Production Deployment

This is a simplified guide to get you started quickly. For detailed instructions, see `AWS-DEPLOYMENT.md`.

## Prerequisites Checklist
- [ ] AWS Account created
- [ ] AWS CLI installed: `brew install awscli` (macOS)
- [ ] AWS CLI configured: `aws configure`
- [ ] Supabase project created and configured
- [ ] Domain name (optional)

---

## Step 1: Build Your App (5 minutes)

```bash
# Make build script executable
chmod +x build-prod.sh

# Create production environment file
cp .env.local .env.production
# Edit .env.production with production credentials

# Build the application
./build-prod.sh
```

✅ You should now have a `dist` folder with your built app.

---

## Step 2: Create S3 Bucket (5 minutes)

```bash
# Replace 'sandra-production' with your unique bucket name
BUCKET_NAME="sandra-production"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html

# Set bucket policy for public read access
cat > bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json

# Upload your files
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Get the website URL
echo "Your site is at: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
```

✅ Your app is now live! (HTTP only, we'll add HTTPS next)

---

## Step 3: Add CloudFront CDN + HTTPS (10 minutes)

### Via AWS Console:
1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click **"Create distribution"**
3. **Origin domain**: Select your S3 bucket
4. **Origin access**: "Origin access control" → Create new OAC
5. **Viewer protocol**: "Redirect HTTP to HTTPS"
6. **Default root object**: `index.html`
7. Click **"Create distribution"**
8. Wait 10-15 minutes for deployment
9. Copy your CloudFront URL (e.g., `d123456.cloudfront.net`)

### Update S3 Bucket Policy:
After creating CloudFront, it will show a policy to add to S3. Copy and replace your S3 bucket policy with it.

### Configure Error Pages (for React Router):
1. In your CloudFront distribution → **Error pages** tab
2. Create custom error responses:
   - Error code: **403** → Response page: `/index.html` → Response code: **200**
   - Error code: **404** → Response page: `/index.html` → Response code: **200**

✅ Your app now has HTTPS and global CDN!

---

## Step 4: Deploy Updates

Every time you make changes:

```bash
# 1. Build
npm run build

# 2. Upload to S3
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# 3. Invalidate CloudFront cache (replace DISTRIBUTION_ID)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Step 5: Set Up Auto-Deploy with GitHub Actions (Optional, 15 minutes)

1. Get AWS credentials for GitHub:
   - Create IAM user: `github-actions-sandra`
   - Attach policies: S3FullAccess, CloudFrontFullAccess
   - Save Access Key ID and Secret

2. Add secrets to GitHub:
   - Go to repository **Settings** → **Secrets** → **Actions**
   - Add these secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `S3_BUCKET_NAME`
     - `CLOUDFRONT_DISTRIBUTION_ID`
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_KEY`
     - `GEMINI_API_KEY`

3. Push to main branch → Automatic deployment! 🎉

See `.github/GITHUB-ACTIONS-SETUP.md` for details.

---

## Costs Estimate

**Monthly costs for low-medium traffic:**
- S3: $0.50 - $2
- CloudFront: $1 - $10
- Route 53 (if using domain): $1
- **Total: ~$2-15/month**

Free tier covers most initial usage!

---

## Your Production URLs

- **S3 direct**: `http://sandra-production.s3-website-us-east-1.amazonaws.com`
- **CloudFront** (use this): `https://d123456.cloudfront.net`
- **Custom domain** (after setup): `https://sandra.yourdomain.com`

---

## Troubleshooting

**404 on page refresh:**
→ Check CloudFront error pages configuration (Step 3)

**Blank page:**
→ Check browser console for errors
→ Verify environment variables in build

**Changes not showing:**
→ Clear CloudFront cache with invalidation command

**S3 upload fails:**
→ Check AWS CLI is configured: `aws sts get-caller-identity`

---

## Next Steps

1. ✅ Your app is live on AWS!
2. Add custom domain (see `AWS-DEPLOYMENT.md`)
3. Set up monitoring (see `SECURITY.md`)
4. Change default admin password
5. Enable Supabase RLS policies
6. Set up regular backups

---

## Support

- Full guide: `AWS-DEPLOYMENT.md`
- Security: `SECURITY.md`
- CI/CD: `.github/GITHUB-ACTIONS-SETUP.md`

**Need help?** Check AWS documentation or Supabase docs.

🎉 Congratulations on deploying to production!

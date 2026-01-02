# GitHub Actions Secrets Setup

To enable automated deployments, add these secrets to your GitHub repository:

## How to Add Secrets:
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add each secret below

## Required Secrets:

### AWS Credentials
```
AWS_ACCESS_KEY_ID
Your AWS access key (from IAM user with S3 and CloudFront permissions)

AWS_SECRET_ACCESS_KEY
Your AWS secret access key

S3_BUCKET_NAME
Your S3 bucket name (e.g., sandra-production)

CLOUDFRONT_DISTRIBUTION_ID
Your CloudFront distribution ID (e.g., E1234ABCD5678)
```

### Application Environment Variables
```
VITE_SUPABASE_URL
https://your-project.supabase.co

VITE_SUPABASE_KEY
your-production-anon-key

GEMINI_API_KEY
your-gemini-api-key
```

## Create AWS IAM User for Deployment

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Add users**
3. User name: `github-actions-sandra`
4. Select **"Access key - Programmatic access"**
5. Click **Next: Permissions**
6. Click **"Attach policies directly"**
7. Add these policies:
   - `AmazonS3FullAccess` (or create custom policy for your bucket only)
   - `CloudFrontFullAccess` (or custom policy for invalidation)
8. Click **Next** → **Create user**
9. **Important**: Copy the Access Key ID and Secret Access Key (shown only once!)
10. Add these to GitHub Secrets

### Custom IAM Policy (More Secure):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sandra-production",
        "arn:aws:s3:::sandra-production/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

## Testing the Workflow

After adding secrets:
1. Commit and push to main branch
2. Go to **Actions** tab in GitHub
3. Watch the deployment workflow run
4. If successful, your app is automatically deployed!

## Manual Deployment Trigger

You can also trigger deployment manually:
1. Go to **Actions** tab
2. Select **"Deploy to AWS S3"** workflow
3. Click **"Run workflow"**
4. Select branch and click **"Run workflow"**

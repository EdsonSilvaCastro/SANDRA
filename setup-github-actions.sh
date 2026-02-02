#!/bin/bash

# Setup GitHub Actions Secrets for Automated Deployment

echo "🔧 GitHub Actions Setup Helper"
echo "==============================="
echo ""

echo "📋 Required GitHub Secrets:"
echo ""
echo "1. AWS Credentials:"
echo "   AWS_ACCESS_KEY_ID (from your AWS account)"
echo "   AWS_SECRET_ACCESS_KEY (from your AWS account)"
echo ""
echo "2. AWS Resources:"
echo "   S3_BUCKET_NAME: constructpro-production"
echo "   CLOUDFRONT_DISTRIBUTION_ID: EJIUI946OZ75J"
echo ""
echo "3. Application Environment:"
echo "   VITE_SUPABASE_URL: https://chzqbcxhqszvsxynxdgj.supabase.co"
echo "   VITE_SUPABASE_KEY: (from your .env.production file)"
echo "   GEMINI_API_KEY: (from your .env.production file)"
echo ""
echo "📝 To add these secrets:"
echo "1. Go to: https://github.com/EdsonSilvaCastro/SANDRA/settings/secrets/actions"
echo "2. Click 'New repository secret' for each one"
echo "3. Enter the Name and Value exactly as shown above"
echo ""
echo "🚀 Once configured, every push to 'main' will automatically deploy!"
echo ""

# Show current AWS configuration
echo "🔍 Current AWS Configuration:"
echo "Account ID: $(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Not configured')"
echo "S3 Bucket: constructpro-production"
echo "CloudFront: EJIUI946OZ75J"
echo "Region: us-east-1"
echo ""

echo "✅ Manual deployment completed successfully!"
echo "🌐 Your app is live at: https://d3lq44x3vjya24.cloudfront.net"
#!/bin/bash

echo "🔍 Validating deployment..."
echo ""

# 1. Check local build
echo "✓ Local build:"
ls -lh dist/index.html
grep -o "index-[^.]*\.js" dist/index.html
echo ""

# 2. Check S3 deployment
echo "✓ S3 files:"
aws s3 ls s3://constructpro-production/assets/ --human-readable
echo ""

# 3. Check CloudFront (live URL)
echo "✓ CloudFront version:"
curl -s https://d3lq44x3vjya24.cloudfront.net/index.html | grep -o "index-[^.]*\.js" || echo "Could not fetch"
echo ""

echo "📝 To see changes immediately:"
echo "1. Open browser in Incognito/Private mode, OR"
echo "2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux), OR"
echo "3. Clear browser cache and reload"
echo ""
echo "🧪 Test the fix by trying to:"
echo "   - Save a budget category"
echo "   - Create/update a task"
echo ""

#!/bin/bash

# Full deployment pipeline: merge, check schema, deploy, and refresh cache
# Created: $(date)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   SANDRA Full Deployment Pipeline${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Step 1: Merge upstream
echo -e "${BLUE}📥 Step 1: Merging upstream/main...${NC}"
echo "Current branch:"
git branch --show-current

echo ""
echo "Fetching from upstream..."
git fetch upstream

echo ""
echo "Checking for uncommitted changes..."
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Stashing uncommitted changes...${NC}"
    git stash save "Auto-stash before deployment $(date)"
    STASHED=true
else
    STASHED=false
fi

echo ""
echo "Merging upstream/main..."
git pull upstream main --no-edit || {
    echo -e "${RED}❌ Merge failed! Please resolve conflicts manually.${NC}"
    exit 1
}

echo -e "${GREEN}✅ Merge complete!${NC}"
echo ""

# Step 2: Check for database schema changes
echo -e "${BLUE}🔍 Step 2: Checking for database schema changes...${NC}"
if node check-schema-changes.js; then
    echo -e "${GREEN}✅ Schema check passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Schema checker reported issues.${NC}"
    echo "Please review and apply necessary migrations before continuing."
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi
echo ""

# Step 3: Build the application
echo -e "${BLUE}🔨 Step 3: Building production version...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Deployment cancelled.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Step 4: Deploy to S3
echo -e "${BLUE}🚀 Step 4: Deploying to S3...${NC}"
aws s3 sync dist/ s3://constructpro-production --delete

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ S3 deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ S3 deployment successful!${NC}"
echo ""

# Step 5: Invalidate CloudFront cache
echo -e "${BLUE}🔄 Step 5: Invalidating CloudFront cache...${NC}"

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='constructpro-production.s3.amazonaws.com']].Id" --output text)

if [ -z "$DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not automatically detect CloudFront distribution ID${NC}"
    echo "Please run manually:"
    echo "aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths '/*'"
else
    echo "Distribution ID: $DISTRIBUTION_ID"
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Cache invalidation initiated!${NC}"
        echo "Invalidation ID: $INVALIDATION_ID"
        echo ""
        echo "Checking invalidation status..."
        aws cloudfront get-invalidation \
            --distribution-id "$DISTRIBUTION_ID" \
            --id "$INVALIDATION_ID" \
            --query 'Invalidation.Status' \
            --output text
    else
        echo -e "${RED}❌ Cache invalidation failed!${NC}"
        echo "You may need to invalidate manually via AWS Console"
    fi
fi

echo ""

# Step 6: Validate deployment
echo -e "${BLUE}✅ Step 6: Validating deployment...${NC}"
echo ""

echo "Local build check:"
if [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✓${NC} dist/index.html exists"
    echo "Build hash: $(grep -o 'index-[^.]*\.js' dist/index.html || echo 'N/A')"
else
    echo -e "${RED}✗${NC} dist/index.html not found"
fi

echo ""
echo "S3 deployment check:"
aws s3 ls s3://constructpro-production/assets/ --human-readable | head -5

echo ""
echo "CloudFront live check:"
LIVE_HASH=$(curl -s https://d3lq44x3vjya24.cloudfront.net/index.html | grep -o 'index-[^.]*\.js' || echo 'Could not fetch')
echo "Live hash: $LIVE_HASH"

echo ""

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo -e "${BLUE}📦 Restoring stashed changes...${NC}"
    git stash pop
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "🌐 Live URL: https://d3lq44x3vjya24.cloudfront.net"
echo ""
echo "📝 Note: Cache invalidation may take 5-15 minutes to propagate globally"
echo "   To see changes immediately:"
echo "   - Open browser in Incognito/Private mode"
echo "   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)"
echo ""
echo -e "${GREEN}🎉 All done!${NC}"

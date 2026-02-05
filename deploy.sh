#!/bin/bash

# Deploy script for SANDRA production
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Deploying to S3..."
    aws s3 sync dist/ s3://constructpro-production --delete
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo "🌐 Your app is now live at https://d3lq44x3vjya24.cloudfront.net"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

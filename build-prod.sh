#!/bin/bash

# Build script for production deployment
echo "🚀 Building SANDRA for production..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your production environment variables"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build files are in the 'dist' directory"
    echo ""
    echo "Next steps:"
    echo "1. Upload the 'dist' folder to AWS S3"
    echo "2. Configure CloudFront distribution"
    echo "3. Set up custom domain with Route 53"
else
    echo "❌ Build failed!"
    exit 1
fi

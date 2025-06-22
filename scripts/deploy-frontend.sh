#!/bin/bash
# scripts/deploy-frontend.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting frontend deployment...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the frontend directory.${NC}"
    exit 1
fi

# Check if terraform directory exists
if [ ! -d "../terraform" ]; then
    echo -e "${RED}❌ Error: terraform directory not found. Please ensure infrastructure is deployed first.${NC}"
    exit 1
fi

# Get deployment configuration from Terraform outputs
cd ../terraform
echo -e "${YELLOW}📋 Getting deployment configuration...${NC}"

BUCKET_NAME=$(terraform output -raw s3_bucket_name 2>/dev/null)
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null)
AWS_REGION=$(terraform output -raw aws_region 2>/dev/null)

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo -e "${RED}❌ Error: Could not get deployment configuration from Terraform.${NC}"
    echo "Please ensure you have deployed the infrastructure first with:"
    echo "cd terraform && terraform apply"
    exit 1
fi

echo -e "${GREEN}✅ Configuration retrieved:${NC}"
echo "  Bucket: $BUCKET_NAME"
echo "  Distribution: $DISTRIBUTION_ID"
echo "  Region: $AWS_REGION"

# Go back to frontend directory
cd ../frontend

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build the application
echo -e "${YELLOW}🏗️  Building React application...${NC}"
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo -e "${RED}❌ Error: Build failed or build directory not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Upload to S3
echo -e "${YELLOW}☁️  Uploading to S3...${NC}"
aws s3 sync build/ s3://${BUCKET_NAME}/ \
    --region ${AWS_REGION} \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json"

# Upload HTML files with shorter cache
echo -e "${YELLOW}📄 Uploading HTML files with no-cache...${NC}"
aws s3 sync build/ s3://${BUCKET_NAME}/ \
    --region ${AWS_REGION} \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --include "service-worker.js" \
    --include "manifest.json"

echo -e "${GREEN}✅ Upload completed${NC}"

# Invalidate CloudFront cache
echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${GREEN}✅ Cache invalidation created: $INVALIDATION_ID${NC}"

# Get website URL
cd ../terraform
WEBSITE_URL=$(terraform output -raw website_url)

echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your website is available at: ${WEBSITE_URL}${NC}"
echo -e "\n${YELLOW}📝 Note: CloudFront cache invalidation may take 5-15 minutes to complete.${NC}"

# Optional: Wait for invalidation to complete
read -p "Do you want to wait for cache invalidation to complete? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏳ Waiting for cache invalidation to complete...${NC}"
    aws cloudfront wait invalidation-completed \
        --distribution-id ${DISTRIBUTION_ID} \
        --id ${INVALIDATION_ID}
    echo -e "${GREEN}✅ Cache invalidation completed!${NC}"
fi

echo -e "\n${GREEN}🚀 Frontend deployment finished!${NC}"
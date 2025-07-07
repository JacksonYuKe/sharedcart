#!/bin/bash
# scripts/deploy-backend.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting backend deployment...${NC}"

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo -e "${RED}❌ Error: go.mod not found. Please run this script from the backend directory.${NC}"
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

ECR_REPOSITORY_URL=$(terraform output -raw ecr_repository_url 2>/dev/null)
AWS_REGION=$(terraform output -raw aws_region 2>/dev/null)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$ECR_REPOSITORY_URL" ]; then
    echo -e "${RED}❌ Error: Could not get ECR repository URL from Terraform.${NC}"
    echo "Please ensure you have deployed the infrastructure first with:"
    echo "cd terraform && terraform apply"
    exit 1
fi

echo -e "${GREEN}✅ Configuration retrieved:${NC}"
echo "  ECR Repository: $ECR_REPOSITORY_URL"
echo "  AWS Region: $AWS_REGION"
echo "  AWS Account: $AWS_ACCOUNT_ID"

# Go back to backend directory
cd ../sharedcart-backend

# Build the Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build -t sharedcart-backend:latest .

# Check if build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Docker build failed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Login to ECR
echo -e "${YELLOW}🔑 Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URL

# Tag and push the image
echo -e "${YELLOW}📤 Pushing image to ECR...${NC}"
docker tag sharedcart-backend:latest $ECR_REPOSITORY_URL:latest
docker push $ECR_REPOSITORY_URL:latest

echo -e "${GREEN}✅ Image pushed successfully${NC}"

# Update ECS service to use the new image
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"
cd ../terraform
CLUSTER_NAME=$(terraform output -raw project_name)-backend-cluster
SERVICE_NAME=$(terraform output -raw project_name)-backend-service

aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION

echo -e "${GREEN}✅ ECS service updated${NC}"

# Get the backend API URL
BACKEND_API_URL=$(terraform output -raw backend_api_url)

echo -e "\n${GREEN}🎉 Backend deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your backend API is available at: ${BACKEND_API_URL}${NC}"
echo -e "\n${YELLOW}📝 Note: ECS service deployment may take 2-5 minutes to complete.${NC}"

# Optional: Wait for service to be stable
read -p "Do you want to wait for the ECS service to be stable? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏳ Waiting for ECS service to be stable...${NC}"
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $AWS_REGION
    echo -e "${GREEN}✅ ECS service is stable!${NC}"
fi

echo -e "\n${GREEN}🚀 Backend deployment finished!${NC}"
echo -e "${GREEN}🔗 Next step: Update frontend to use: ${BACKEND_API_URL}${NC}"
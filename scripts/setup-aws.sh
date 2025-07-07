#!/bin/bash
# scripts/setup-aws.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SharedCart AWS Setup Script${NC}"
echo -e "${BLUE}================================${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed.${NC}"
    echo "Please install it first:"
    echo "  macOS: brew install awscli"
    echo "  Ubuntu: sudo apt install awscli"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed.${NC}"
    echo "Please install it first:"
    echo "  macOS: brew install terraform"
    echo "  Ubuntu: sudo apt install terraform"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites installed${NC}"

# Check AWS credentials
echo -e "${YELLOW}🔑 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured.${NC}"
    echo "Please configure your AWS credentials:"
    echo "  aws configure"
    echo ""
    echo "You'll need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region: ca-central-1"
    exit 1
fi

# Get AWS account info
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
AWS_REGION=$(aws configure get region)

echo -e "${GREEN}✅ AWS credentials configured${NC}"
echo "  Account: $AWS_ACCOUNT"
echo "  User: $AWS_USER"
echo "  Region: $AWS_REGION"

# Verify region is Canada Central
if [ "$AWS_REGION" != "ca-central-1" ]; then
    echo -e "${YELLOW}⚠️  Warning: Your default region is $AWS_REGION${NC}"
    echo "SharedCart is optimized for ca-central-1 (Canada Central)"
    read -p "Do you want to continue with $AWS_REGION? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please update your AWS region:"
        echo "  aws configure set region ca-central-1"
        exit 1
    fi
fi

# Setup Terraform
echo -e "\n${YELLOW}🏗️  Setting up Terraform...${NC}"

# Create terraform directory if it doesn't exist
if [ ! -d "terraform" ]; then
    echo -e "${YELLOW}📁 Creating terraform directory...${NC}"
    mkdir terraform
fi

cd terraform

# Copy terraform.tfvars if it doesn't exist
if [ ! -f "terraform.tfvars" ]; then
    if [ -f "terraform.tfvars.example" ]; then
        echo -e "${YELLOW}📋 Creating terraform.tfvars from example...${NC}"
        cp terraform.tfvars.example terraform.tfvars
        echo -e "${GREEN}✅ Created terraform.tfvars${NC}"
        echo -e "${YELLOW}💡 You can edit terraform.tfvars to customize your deployment${NC}"
    else
        echo -e "${YELLOW}📋 Creating basic terraform.tfvars...${NC}"
        cat > terraform.tfvars << EOF
# SharedCart Terraform Variables
aws_region   = "$AWS_REGION"
project_name = "sharedcart"
environment  = "production"
owner        = "$(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)"

# Custom domain (optional)
enable_custom_domain = false
domain_name         = ""
EOF
        echo -e "${GREEN}✅ Created terraform.tfvars${NC}"
    fi
fi

# Initialize Terraform
echo -e "${YELLOW}🔧 Initializing Terraform...${NC}"
terraform init

# Validate Terraform configuration
echo -e "${YELLOW}✅ Validating Terraform configuration...${NC}"
terraform validate

# Show what will be created
echo -e "\n${YELLOW}📋 Planning infrastructure deployment...${NC}"
terraform plan

echo -e "\n${BLUE}🎯 Ready to Deploy!${NC}"
echo -e "${BLUE}==================${NC}"
echo ""
echo "Your AWS infrastructure is ready to deploy. Here's what will be created:"
echo ""
echo "✅ S3 bucket for frontend hosting"
echo "✅ CloudFront distribution (CDN)"
echo "✅ SSL certificate (HTTPS)"
echo "✅ Proper security configurations"
echo ""
echo -e "${GREEN}💰 Estimated monthly cost: ~\$1-5 CAD${NC}"
echo ""
echo "Next steps:"
echo "1. Review the Terraform plan above"
echo "2. Deploy infrastructure: cd terraform && terraform apply"
echo "3. Build and deploy frontend: ./scripts/deploy-frontend.sh"
echo ""

# Ask if user wants to deploy now
read -p "Do you want to deploy the infrastructure now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚀 Deploying infrastructure...${NC}"
    terraform apply
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}🎉 Infrastructure deployed successfully!${NC}"
        
        # Get the website URL
        WEBSITE_URL=$(terraform output -raw website_url)
        echo -e "${GREEN}🌐 Your infrastructure is ready at: $WEBSITE_URL${NC}"
        echo ""
        echo "Next step: Deploy your frontend application"
        echo "  cd ../sharedcart-frontend && ../scripts/deploy-frontend.sh"
    else
        echo -e "${RED}❌ Infrastructure deployment failed${NC}"
        exit 1
    fi
else
    echo -e "\n${YELLOW}📝 Infrastructure not deployed yet.${NC}"
    echo "When you're ready, run:"
    echo "  cd terraform && terraform apply"
fi

echo -e "\n${GREEN}✅ AWS setup completed!${NC}"
#!/bin/bash
# scripts/setup-complete.sh
# Complete setup script for SharedCart frontend + AWS deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     SharedCart Setup                        ║"
echo "║              Frontend + AWS S3/CloudFront                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print step
print_step() {
    echo -e "\n${BLUE}${BOLD}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..50})${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step "Step 1: Checking Prerequisites"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed"
    echo "Please install Node.js (v16 or higher):"
    echo "  Visit: https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

# Check AWS CLI
if command_exists aws; then
    AWS_VERSION=$(aws --version)
    print_success "AWS CLI installed: $AWS_VERSION"
else
    print_error "AWS CLI is not installed"
    echo "Please install AWS CLI:"
    echo "  macOS: brew install awscli"
    echo "  Ubuntu: sudo apt install awscli"
    echo "  Windows: https://aws.amazon.com/cli/"
    exit 1
fi

# Check Terraform
if command_exists terraform; then
    TERRAFORM_VERSION=$(terraform version | head -n1)
    print_success "Terraform installed: $TERRAFORM_VERSION"
else
    print_error "Terraform is not installed"
    echo "Please install Terraform:"
    echo "  macOS: brew install terraform"
    echo "  Ubuntu: sudo apt install terraform"
    echo "  Windows: https://terraform.io/"
    exit 1
fi

print_step "Step 2: Setting up React Frontend"

# Create frontend if it doesn't exist
if [ ! -d "frontend" ]; then
    echo -e "${YELLOW}📦 Creating React frontend...${NC}"
    npx create-react-app frontend --template typescript
    print_success "React app created"
else
    print_success "Frontend directory already exists"
fi

# Install additional dependencies
cd frontend
echo -e "${YELLOW}📦 Installing additional dependencies...${NC}"
npm install @reduxjs/toolkit react-redux @mui/material @emotion/react @emotion/styled @mui/icons-material axios react-router-dom
npm install --save-dev @types/react-router-dom

print_success "Dependencies installed"
cd ..

print_step "Step 3: Creating Project Structure"

# Create all necessary directories
mkdir -p scripts
mkdir -p terraform
mkdir -p frontend/src/components/{common,auth,dashboard,bills,groups}
mkdir -p frontend/src/pages
mkdir -p frontend/src/services
mkdir -p frontend/src/store/slices
mkdir -p frontend/src/types
mkdir -p frontend/src/utils
mkdir -p frontend/src/hooks

print_success "Directory structure created"

print_step "Step 4: Setting up Scripts"

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null || true

print_success "Scripts configured"

print_step "Step 5: AWS Configuration Check"

# Check AWS credentials
if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region)
    print_success "AWS credentials configured"
    echo "  Account: $AWS_ACCOUNT"
    echo "  Region: $AWS_REGION"
else
    print_warning "AWS credentials not configured"
    echo "Please configure your AWS credentials:"
    echo "  aws configure"
    echo ""
    echo "You'll need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region: ca-central-1"
fi

print_step "Setup Complete!"

echo -e "\n${GREEN}${BOLD}🎉 SharedCart setup completed successfully!${NC}"
echo ""
echo "Your project structure:"
echo "├── frontend/                 # React TypeScript app"
echo "├── terraform/               # AWS infrastructure"
echo "├── scripts/                 # Deployment scripts"
echo "└── (your existing backend)  # Go backend"
echo ""

echo -e "${BLUE}${BOLD}Next Steps:${NC}"
echo ""
echo -e "${YELLOW}1. Configure AWS (if not done yet):${NC}"
echo "   aws configure"
echo ""
echo -e "${YELLOW}2. Deploy AWS infrastructure:${NC}"
echo "   ./scripts/setup-aws.sh"
echo ""
echo -e "${YELLOW}3. Start developing your frontend:${NC}"
echo "   cd frontend && npm start"
echo ""
echo -e "${YELLOW}4. Deploy frontend to AWS:${NC}"
echo "   cd frontend && npm run deploy"
echo ""

echo -e "${GREEN}${BOLD}Important Notes:${NC}"
echo -e "💰 AWS costs: ~\$1-5 CAD/month for S3 + CloudFront"
echo -e "🌍 Optimized for Toronto users (ca-central-1 region)"
echo -e "🔒 HTTPS and CDN included by default"
echo -e "📱 Mobile-responsive React app"
echo ""

echo -e "${BLUE}${BOLD}Need help?${NC}"
echo "- Check the README files in each directory"
echo "- Review the Terraform plan before applying"
echo "- Test locally first: cd frontend && npm start"
echo ""

print_success "Setup script completed!"
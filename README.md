# SharedCart - Expense Sharing Application

A modern expense sharing application built with Go backend, React frontend, and PostgreSQL database.

## 🚀 Features

- **User Authentication** - Secure JWT-based login/register
- **Group Management** - Create and manage expense-sharing groups
- **Bill Tracking** - Add bills with shared and personal items
- **Settlement Calculation** - Automatic calculation of who owes whom
- **Real-time Updates** - Redux state management for instant updates
- **Responsive Design** - Works great on mobile and desktop

## 🛠️ Tech Stack

### Backend
- **Go 1.23** with Gin framework
- **PostgreSQL** with GORM ORM
- **JWT** authentication
- **CORS** enabled
- **Environment-based** configuration

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** components
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Axios** for API calls

### Infrastructure
- **AWS RDS** PostgreSQL (Free Tier)
- **AWS S3 + CloudFront** for frontend hosting
- **Terraform** for infrastructure as code
- **GitHub Actions** for CI/CD

## 🏗️ Project Structure

```
sharedcart/
├── sharedcart-backend/          # Go API server
│   ├── cmd/server/             # Application entry point
│   ├── internal/               # Private application code
│   │   ├── api/               # HTTP handlers and routes
│   │   ├── database/          # Database connection and migrations
│   │   ├── models/            # Data models
│   │   └── services/          # Business logic
│   ├── config/                # Configuration management
│   ├── pkg/utils/             # Utility functions
│   └── .github/workflows/     # CI/CD pipelines
├── sharedcart-frontend/        # React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── store/             # Redux store and slices
│   │   ├── services/          # API service layer
│   │   └── types/             # TypeScript definitions
│   └── build/                 # Production build
├── terraform/                  # Infrastructure as code
│   ├── main.tf               # Main Terraform configuration
│   ├── rds-free.tf           # Free RDS PostgreSQL setup
│   ├── s3.tf                 # S3 bucket for frontend
│   └── cloudfront.tf         # CloudFront CDN
└── scripts/                   # Deployment scripts
    ├── setup-aws.sh          # AWS infrastructure setup
    └── deploy-frontend.sh    # Frontend deployment
```

## 🚀 Quick Start

### Prerequisites

- Go 1.23+
- Node.js 16+
- PostgreSQL (or use AWS RDS)
- AWS CLI configured
- Terraform installed

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/sharedcart.git
cd sharedcart
```

### 2. Backend Setup

```bash
cd sharedcart-backend

# Install dependencies
go mod tidy

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Run locally
make run
```

### 3. Frontend Setup

```bash
cd sharedcart-frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Database Setup (AWS RDS Free Tier)

```bash
cd terraform

# Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Deploy infrastructure
terraform init
terraform apply
```

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User accounts and authentication
- **groups** - Expense sharing groups
- **group_members** - Group memberships and roles
- **bills** - Expense bills and transactions
- **bill_items** - Individual items in bills
- **item_owners** - Who shares each item
- **settlements** - Settlement calculations
- **settlement_transactions** - Payment tracking

## 🔧 Environment Variables

### Backend (.env)
```bash
# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=sharedcart
DB_SSL_MODE=require

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRY_HOURS=24

# Server
PORT=8080
GIN_MODE=debug
```

### Frontend (.env.local)
```bash
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_ENVIRONMENT=development
```

## 🚀 Deployment

### Production Deployment to AWS

1. **Deploy Infrastructure**
```bash
cd terraform
terraform apply
```

2. **Deploy Frontend**
```bash
cd sharedcart-frontend
npm run build
npm run deploy
```

3. **Deploy Backend** (to Railway or AWS)
```bash
# Railway (Free)
railway login
railway up

# Or deploy to AWS ECS/Lambda
```

## 📈 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Groups
- `GET /api/v1/groups` - List user's groups
- `POST /api/v1/groups` - Create new group
- `GET /api/v1/groups/:id` - Get group details
- `POST /api/v1/groups/:id/members` - Add group member

### Bills
- `GET /api/v1/bills` - List bills
- `POST /api/v1/bills` - Create new bill
- `GET /api/v1/bills/:id` - Get bill details
- `POST /api/v1/bills/:id/finalize` - Finalize bill

### Settlements
- `POST /api/v1/settlements/calculate` - Calculate settlements
- `GET /api/v1/settlements` - List settlements

## 🧪 Testing

### Backend Tests
```bash
cd sharedcart-backend
go test ./...
```

### Frontend Tests
```bash
cd sharedcart-frontend
npm test
```

## 🎯 Production URLs

- **Frontend**: https://dec3irsdiv3r3.cloudfront.net
- **Backend**: Configure with your deployment
- **Database**: AWS RDS PostgreSQL (Free Tier)

## 💰 Cost Estimation

- **AWS RDS PostgreSQL**: FREE (12 months)
- **AWS S3 + CloudFront**: ~$3 CAD/month
- **Backend Hosting**: FREE (Railway) or ~$5-20/month (AWS)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern Go and React best practices
- Inspired by popular expense sharing apps
- Uses AWS Free Tier for cost-effective hosting

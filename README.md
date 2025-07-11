# SharedCart

A full-stack expense sharing application for groups to track and settle shared expenses.

## 🌐 Live Demo

- **Frontend**: https://dec3irsdiv3r3.cloudfront.net
- **Backend API**: https://sharedcart-backend-snowy-sky-5801.fly.dev

### Test Credentials
- **Email**: `flyio-test@example.com`
- **Password**: `testpassword`

## ✨ Features

- 🔐 User authentication and registration
- 👥 Create and manage expense groups
- 💳 Add bills and track shared expenses
- 🧮 Automatic settlement calculations
- ⚡ Real-time updates
- 💰 Precise decimal handling for financial calculations

## 🛠 Tech Stack

### Backend
- **Language**: Go 1.23+
- **Framework**: Gin HTTP framework
- **Database**: PostgreSQL with GORM ORM
- **Authentication**: JWT tokens
- **Deployment**: Fly.io
- **Cost**: ~$1-3/month

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Deployment**: AWS S3 + CloudFront
- **Cost**: ~$1-5/month

### Database
- **Database**: AWS RDS PostgreSQL
- **Features**: SSL encryption, automated backups
- **Cost**: ~$12/month (Free tier eligible)

### Total Monthly Cost: ~$14-20

## 🚀 Deployment Architecture

```
Frontend (React)     Backend (Go)        Database
     │                    │                 │
AWS S3/CloudFront ──── Fly.io ──────── AWS RDS PostgreSQL
 (~$1-5/month)       (~$1-3/month)    (~$12/month)
```

## 🏃‍♂️ Getting Started

### Prerequisites
- Go 1.23+
- Node.js 16+
- PostgreSQL (for local development)

### Backend Development
```bash
cd sharedcart-backend

# Install dependencies
go mod tidy

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
make migrate-up

# Start development server
make dev
```

### Frontend Development
```bash
cd sharedcart-frontend

# Install dependencies
npm install

# Set up environment
echo "REACT_APP_API_URL=http://localhost:8080/api/v1" > .env

# Start development server
npm start
```

### Local Testing
1. Start the backend: `cd sharedcart-backend && make dev`
2. Start the frontend: `cd sharedcart-frontend && npm start`
3. Open http://localhost:3000

## 📦 Production Deployment

### Backend (Fly.io)
```bash
# Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
flyctl auth login
flyctl deploy
```

### Frontend (AWS S3/CloudFront)
```bash
# Build for production
npm run build

# Deploy to AWS (requires AWS CLI configured)
aws s3 sync build/ s3://your-bucket-name/
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## 🧪 API Testing

### Health Check
```bash
curl https://sharedcart-backend-snowy-sky-5801.fly.dev/health
```

### Register User
```bash
curl -X POST https://sharedcart-backend-snowy-sky-5801.fly.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","name":"Test User"}'
```

### Login
```bash
curl -X POST https://sharedcart-backend-snowy-sky-5801.fly.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## License

MIT License
# Trigger CI/CD - Thu 10 Jul 2025 23:35:28 EDT

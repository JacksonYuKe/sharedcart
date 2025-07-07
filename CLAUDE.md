# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SharedCart is a full-stack expense sharing application for groups to track and settle shared expenses. The codebase is organized as a monorepo with:
- **Backend**: Go REST API using Gin framework (`/sharedcart-backend`)
- **Frontend**: React with TypeScript and Material-UI (`/sharedcart-frontend`)
- **Infrastructure**: Terraform configurations for AWS deployment (`/terraform`)

## Production Deployment

**Live Application**: https://dec3irsdiv3r3.cloudfront.net
**Backend API**: https://sharedcart-backend-snowy-sky-5801.fly.dev

### Architecture
- **Backend**: Deployed on Fly.io (~$1-3/month)
- **Frontend**: Deployed on AWS S3 + CloudFront (~$1-5/month)
- **Database**: AWS RDS PostgreSQL (~$12/month)
- **Total Cost**: ~$14-20/month

### Test Credentials
- Email: `flyio-test@example.com`
- Password: `testpassword`

## Essential Development Commands

### Backend Development (Go)

```bash
cd sharedcart-backend

# Development
make dev              # Run with hot reload (requires Air)
make run              # Run directly
make build            # Build binary to bin/sharedcart

# Testing & Quality
make test             # Run all tests
make test-coverage    # Generate coverage report
make lint             # Run golangci-lint
make pre-commit       # Run fmt, vet, lint, and tests

# Database
make migrate-up       # Apply migrations
make migrate-down     # Rollback migrations
make migrate-create NAME=migration_name  # Create new migration

# Docker
docker-compose up -d  # Start PostgreSQL and pgAdmin
make docker-build     # Build Docker image
```

### Frontend Development (React/TypeScript)

```bash
cd sharedcart-frontend

# Development
npm start             # Start dev server (port 3000)
npm test              # Run tests
npm run build         # Build for production

# Deployment
npm run deploy        # Deploy to AWS (requires setup)
npm run setup-aws     # Initial AWS infrastructure setup
```

### Running a Single Test

**Backend (Go):**
```bash
# Run specific test file
go test ./internal/services/group_service_test.go

# Run specific test function
go test -run TestGroupService_CreateGroup ./internal/services/

# With verbose output
go test -v -run TestName ./path/to/package/
```

**Frontend (React):**
```bash
# Run specific test file
npm test -- GroupList.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should create group"

# Watch mode for specific file
npm test -- --watch GroupList.test.tsx
```

## Architecture & Code Structure

### Backend Architecture

The backend follows a layered architecture:

1. **Routes** (`internal/api/routes/routes.go`): Define API endpoints
   - Public routes: `/api/v1/auth/*`
   - Protected routes: All other endpoints require JWT authentication
   - RESTful design with nested resources

2. **Handlers** (`internal/api/handlers/`): HTTP request/response handling
   - Parse requests, validate input
   - Call services, format responses
   - Error handling with consistent JSON format

3. **Services** (`internal/services/`): Business logic layer
   - Transaction management
   - Complex operations (e.g., settlement calculations)
   - Data validation and authorization

4. **Models** (`internal/models/`): GORM database models
   - Soft deletes with `DeletedAt`
   - Decimal type for money (shopspring/decimal)
   - Relationship definitions with foreign keys

### Frontend Architecture

React application with TypeScript and Redux:

1. **API Layer** (`src/services/api.ts`): Centralized API client
   - Axios interceptors for auth token attachment
   - Typed request/response interfaces
   - Automatic 401 handling with redirect

2. **State Management** (`src/store/`): Redux Toolkit slices
   - `authSlice`: User authentication state
   - `groupSlice`: Group management
   - `billSlice`: Bill operations
   - Async thunks for API calls

3. **Components**: Feature-based organization
   - `auth/`: Login, Register forms
   - `bills/`: Bill creation, listing, item management
   - `groups/`: Group CRUD operations
   - `settlements/`: Settlement tracking and confirmation
   - `common/`: Layout, ProtectedRoute

4. **Pages**: Two versions of pages exist
   - Regular pages: Current implementation
   - "New" pages: Updated designs being developed

### Key Patterns

1. **Authentication Flow**:
   - JWT tokens stored in localStorage
   - Automatic token attachment via axios interceptor
   - Protected routes using `ProtectedRoute` component
   - Token refresh endpoint available

2. **Database Relationships**:
   - Groups have members through `GroupMember` join table
   - Bills belong to groups and have multiple items
   - Items can have multiple owners with custom split ratios
   - Settlements track transactions between users

3. **API Response Format**:
   ```json
   {
     "data": {...},      // For successful responses
     "error": "message"  // For error responses
   }
   ```

4. **Environment Configuration**:
   - Backend: Uses environment variables with fallbacks
   - Frontend: `REACT_APP_API_URL` for API endpoint
   - Production mode requires JWT_SECRET

5. **Money Handling**:
   - Backend uses decimal type for precision
   - Frontend displays with 2 decimal places
   - All amounts stored in base currency units

## Common Development Tasks

### Adding a New API Endpoint

1. Define route in `internal/api/routes/routes.go`
2. Create handler in `internal/api/handlers/`
3. Implement service logic in `internal/services/`
4. Add frontend API method in `src/services/api.ts`
5. Create/update Redux slice if needed
6. Update TypeScript types in `src/types/`

### Database Migrations

```bash
# Create migration
make migrate-create NAME=add_user_preferences

# Edit the migration files in db/migrations/
# Then apply:
make migrate-up
```

### Running with Docker

```bash
# Start services
docker-compose up -d

# Backend will connect to PostgreSQL on localhost:5432
# pgAdmin available at localhost:5050
```

## Production Deployment Commands

### Deploy Backend to Fly.io
```bash
cd sharedcart-backend
export PATH="/Users/jackson/.fly/bin:$PATH"
flyctl deploy
```

### Deploy Frontend to AWS
```bash
cd sharedcart-frontend

# Build for production (uses .env.production)
npm run build

# Deploy to S3
aws s3 sync build/ s3://sharedcart-frontend-d6e31480/ \
  --region ca-central-1 --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E3232FPKVQX4SQ --paths "/*"
```

### Environment Configuration
- **Local Development**: Uses `.env` files
- **Production Backend**: Environment variables set via `flyctl secrets set`
- **Production Frontend**: Uses `.env.production` file

### Production Environment Variables (Backend)
```bash
# Required secrets on Fly.io
flyctl secrets set \
  DB_HOST="sharedcart-db-free.cbsuggwoea4j.ca-central-1.rds.amazonaws.com" \
  DB_PASSWORD="your-rds-password" \
  JWT_SECRET="your-jwt-secret" \
  DB_SSL_MODE="require"
```

## Important Notes

- Always run `make pre-commit` before committing backend changes
- Frontend uses Create React App defaults for linting
- Use decimal type for all monetary values in backend
- Maintain soft delete pattern (don't hard delete records)
- Keep API responses consistent with established format
- Test authorization logic thoroughly (group membership, ownership)
- Update both regular and "New" page versions when making UI changes
- Production backend requires SSL connection to AWS RDS
- CloudFront cache invalidation takes 5-15 minutes to complete
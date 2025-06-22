# SharedCart

A full-stack expense sharing application for groups.

## Features

- User authentication and registration
- Create and manage expense groups
- Add bills and track shared expenses
- Automatic settlement calculations
- Real-time updates

## Tech Stack

- **Backend**: Go with Gin framework
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **Infrastructure**: AWS (RDS, S3, CloudFront)

## Getting Started

### Backend
```bash
cd sharedcart-backend
go mod tidy
cp .env.example .env
make run
```

### Frontend
```bash
cd sharedcart-frontend
npm install
npm start
```

## License

MIT License

# Variables
BINARY_NAME=sharedcart
DOCKER_IMAGE_NAME=sharedcart-backend
DOCKER_TAG=latest

# Go commands
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Build the project
build:
	$(GOBUILD) -o bin/$(BINARY_NAME) -v ./cmd/server

# Run the application
run:
	$(GOCMD) run cmd/server/main.go

# Clean build artifacts
clean:
	$(GOCLEAN)
	rm -rf bin/

# Run tests
test:
	$(GOTEST) -v ./...

# Run tests with coverage
test-coverage:
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

# Download dependencies
deps:
	$(GOMOD) download

# Tidy dependencies
tidy:
	$(GOMOD) tidy

# Run linter (requires golangci-lint)
lint:
	golangci-lint run

# Install golangci-lint
install-lint:
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.54.2

# Database migrations (requires golang-migrate)
DB_URL ?= postgresql://admin:password@localhost:5432/sharedcart?sslmode=disable

migrate-up:
	migrate -path migrations -database "$(DB_URL)" up

migrate-down:
	migrate -path migrations -database "$(DB_URL)" down

migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir migrations -seq $$name

# Docker commands
docker-build:
	docker build -t $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) .

docker-run:
	docker run -p 8080:8080 --env-file .env $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

docker-push:
	docker push $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

# Development with hot reload (requires air)
dev:
	air

# Install air for hot reload
install-air:
	go install github.com/cosmtrek/air@latest

# Setup development environment
setup-dev: deps install-air install-lint
	@echo "Development environment setup complete!"
	@echo "You may also want to install golang-migrate:"
	@echo "  brew install golang-migrate  # macOS"
	@echo "  or visit: https://github.com/golang-migrate/migrate"

# Format code
fmt:
	$(GOCMD) fmt ./...

# Vet code
vet:
	$(GOCMD) vet ./...

# Run all pre-commit checks
pre-commit: fmt vet lint test

# Show help
help:
	@echo "Available targets:"
	@echo "  make build          - Build the binary"
	@echo "  make run            - Run the application"
	@echo "  make test           - Run tests"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo "  make lint           - Run linter"
	@echo "  make dev            - Run with hot reload (requires air)"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make docker-run     - Run Docker container"
	@echo "  make migrate-up     - Run database migrations"
	@echo "  make migrate-down   - Rollback database migrations"
	@echo "  make setup-dev      - Setup development environment"
	@echo "  make pre-commit     - Run all checks before committing"
	@echo "  make help           - Show this help message"

.PHONY: build run clean test test-coverage deps tidy lint install-lint \
        migrate-up migrate-down migrate-create docker-build docker-run \
        dev install-air setup-dev fmt vet pre-commit help
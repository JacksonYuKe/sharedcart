package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Database DatabaseConfig
	Server   ServerConfig
	JWT      JWTConfig
	App      AppConfig
}

type DatabaseConfig struct {
	Host         string
	Port         int
	User         string
	Password     string
	Name         string
	SSLMode      string
	MaxIdleConns int
	MaxOpenConns int
	MaxLifetime  time.Duration
}

type ServerConfig struct {
	Port    string
	Mode    string // "debug", "release", "test"
	Timeout time.Duration
}

type JWTConfig struct {
	Secret      string
	ExpiryHours int
}

type AppConfig struct {
	Name        string
	Environment string // "development", "staging", "production"
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	cfg := &Config{
		Database: DatabaseConfig{
			Host:         getEnv("DB_HOST", "localhost"),
			Port:         getEnvAsInt("DB_PORT", 5432),
			User:         getEnv("DB_USER", "admin"),
			Password:     getEnv("DB_PASSWORD", "password"),
			Name:         getEnv("DB_NAME", "sharedcart"),
			SSLMode:      getEnv("DB_SSL_MODE", "disable"),
			MaxIdleConns: getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
			MaxOpenConns: getEnvAsInt("DB_MAX_OPEN_CONNS", 100),
			MaxLifetime:  time.Duration(getEnvAsInt("DB_MAX_LIFETIME_MINUTES", 5)) * time.Minute,
		},
		Server: ServerConfig{
			Port:    getEnv("PORT", "8080"),
			Mode:    getEnv("GIN_MODE", "debug"),
			Timeout: time.Duration(getEnvAsInt("SERVER_TIMEOUT_SECONDS", 30)) * time.Second,
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "your-secret-key-change-this"),
			ExpiryHours: getEnvAsInt("JWT_EXPIRY_HOURS", 24),
		},
		App: AppConfig{
			Name:        getEnv("APP_NAME", "SharedCart"),
			Environment: getEnv("ENV", "development"),
		},
	}

	// Validate required fields
	if cfg.JWT.Secret == "your-secret-key-change-this" && cfg.App.Environment == "production" {
		return nil, fmt.Errorf("JWT secret must be set in production")
	}

	return cfg, nil
}

// GetDSN returns the database connection string
func (db *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		db.Host, db.Port, db.User, db.Password, db.Name, db.SSLMode)
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	strValue := getEnv(key, "")
	if value, err := strconv.Atoi(strValue); err == nil {
		return value
	}
	return defaultValue
}

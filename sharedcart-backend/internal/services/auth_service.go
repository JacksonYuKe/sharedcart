package services

import (
	"errors"
	"fmt"
	"strings"

	"github.com/JacksonYuKe/sharedcart-backend/config"
	"github.com/JacksonYuKe/sharedcart-backend/internal/database"
	"github.com/JacksonYuKe/sharedcart-backend/internal/models"
	"github.com/JacksonYuKe/sharedcart-backend/pkg/utils"
	"gorm.io/gorm"
)

// AuthService handles authentication operations
type AuthService struct {
	db     *gorm.DB
	config *config.JWTConfig
}

// NewAuthService creates a new auth service
func NewAuthService(cfg *config.JWTConfig) *AuthService {
	return &AuthService{
		db:     database.DB,
		config: cfg,
	}
}

// RegisterRequest represents registration input
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

// LoginRequest represents login input
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

// Register creates a new user account
func (s *AuthService) Register(req RegisterRequest) (*AuthResponse, error) {
	// Normalize email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check if user already exists
	var existingUser models.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, fmt.Errorf("user with email %s already exists", req.Email)
	}

	// Validate password
	if err := utils.ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := models.User{
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		IsActive: true,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email, user.Name, s.config.Secret, s.config.ExpiryHours)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

// Login authenticates a user and returns a token
func (s *AuthService) Login(req LoginRequest) (*AuthResponse, error) {
	// Normalize email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Find user
	var user models.User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid credentials")
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Check if user is active
	if !user.IsActive {
		return nil, fmt.Errorf("account is deactivated")
	}

	// Verify password
	if err := utils.CheckPassword(req.Password, user.Password); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email, user.Name, s.config.Secret, s.config.ExpiryHours)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

// RefreshToken generates a new token from an existing valid token
func (s *AuthService) RefreshToken(oldToken string) (string, error) {
	return utils.RefreshJWT(oldToken, s.config.Secret, s.config.ExpiryHours)
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(userID uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

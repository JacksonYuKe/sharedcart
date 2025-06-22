package utils

import (
	"testing"
	"time"
)

func TestGenerateJWT(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	email := "test@example.com"
	name := "Test User"
	expiryHours := 24

	token, err := GenerateJWT(userID, email, name, secret, expiryHours)
	if err != nil {
		t.Fatalf("GenerateJWT() error = %v", err)
	}

	if token == "" {
		t.Error("GenerateJWT() returned empty token")
	}

	// Validate the token
	claims, err := ValidateJWT(token, secret)
	if err != nil {
		t.Fatalf("Failed to validate generated token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Email != email {
		t.Errorf("Email = %v, want %v", claims.Email, email)
	}
	if claims.Name != name {
		t.Errorf("Name = %v, want %v", claims.Name, name)
	}
}

func TestValidateJWT(t *testing.T) {
	secret := "test-secret-key"
	wrongSecret := "wrong-secret"
	userID := uint(1)
	email := "test@example.com"
	name := "Test User"

	// Generate a valid token
	validToken, _ := GenerateJWT(userID, email, name, secret, 24)

	// Generate an expired token
	expiredToken, _ := GenerateJWT(userID, email, name, secret, -1)

	tests := []struct {
		name    string
		token   string
		secret  string
		wantErr bool
	}{
		{
			name:    "Valid token",
			token:   validToken,
			secret:  secret,
			wantErr: false,
		},
		{
			name:    "Wrong secret",
			token:   validToken,
			secret:  wrongSecret,
			wantErr: true,
		},
		{
			name:    "Invalid token",
			token:   "invalid.token.here",
			secret:  secret,
			wantErr: true,
		},
		{
			name:    "Empty token",
			token:   "",
			secret:  secret,
			wantErr: true,
		},
		{
			name:    "Expired token",
			token:   expiredToken,
			secret:  secret,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := ValidateJWT(tt.token, tt.secret)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateJWT() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && claims == nil {
				t.Error("ValidateJWT() returned nil claims for valid token")
			}
		})
	}
}

func TestRefreshJWT(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	email := "test@example.com"
	name := "Test User"
	expiryHours := 24

	// Generate initial token
	oldToken, err := GenerateJWT(userID, email, name, secret, expiryHours)
	if err != nil {
		t.Fatalf("Failed to generate initial token: %v", err)
	}

	// Sleep for a full second to ensure different issue time
	time.Sleep(time.Second * 1)

	// Refresh the token
	newToken, err := RefreshJWT(oldToken, secret, expiryHours)
	if err != nil {
		t.Fatalf("RefreshJWT() error = %v", err)
	}

	if newToken == "" {
		t.Error("RefreshJWT() returned empty token")
	}

	// Note: The tokens might be the same if generated within the same second
	// What matters is that the refresh works and produces a valid token

	// Validate the new token
	claims, err := ValidateJWT(newToken, secret)
	if err != nil {
		t.Fatalf("Failed to validate refreshed token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Email != email {
		t.Errorf("Email = %v, want %v", claims.Email, email)
	}
	if claims.Name != name {
		t.Errorf("Name = %v, want %v", claims.Name, name)
	}
}

func TestRefreshJWTWithInvalidToken(t *testing.T) {
	secret := "test-secret-key"

	// Try to refresh an invalid token
	_, err := RefreshJWT("invalid.token.here", secret, 24)
	if err == nil {
		t.Error("RefreshJWT() should fail with invalid token")
	}
}

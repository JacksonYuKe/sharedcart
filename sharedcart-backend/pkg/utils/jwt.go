package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the claims in JWT token
type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	// Explicitly define registered claims fields instead of embedding
	ExpiresAt *jwt.NumericDate `json:"exp,omitempty"`
	IssuedAt  *jwt.NumericDate `json:"iat,omitempty"`
	NotBefore *jwt.NumericDate `json:"nbf,omitempty"`
	Issuer    string           `json:"iss,omitempty"`
	Subject   string           `json:"sub,omitempty"`
	Audience  jwt.ClaimStrings `json:"aud,omitempty"`
	ID        string           `json:"jti,omitempty"`
}

// GetExpirationTime implements jwt.Claims
func (c *JWTClaims) GetExpirationTime() (*jwt.NumericDate, error) {
	return c.ExpiresAt, nil
}

// GetIssuedAt implements jwt.Claims
func (c *JWTClaims) GetIssuedAt() (*jwt.NumericDate, error) {
	return c.IssuedAt, nil
}

// GetNotBefore implements jwt.Claims
func (c *JWTClaims) GetNotBefore() (*jwt.NumericDate, error) {
	return c.NotBefore, nil
}

// GetIssuer implements jwt.Claims
func (c *JWTClaims) GetIssuer() (string, error) {
	return c.Issuer, nil
}

// GetSubject implements jwt.Claims
func (c *JWTClaims) GetSubject() (string, error) {
	return c.Subject, nil
}

// GetAudience implements jwt.Claims
func (c *JWTClaims) GetAudience() (jwt.ClaimStrings, error) {
	return c.Audience, nil
}

// GenerateJWT generates a new JWT token for a user
func GenerateJWT(userID uint, email, name, secret string, expiryHours int) (string, error) {
	claims := &JWTClaims{
		UserID:    userID,
		Email:     email,
		Name:      name,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * time.Duration(expiryHours))),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		NotBefore: jwt.NewNumericDate(time.Now()),
		Issuer:    "sharedcart",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateJWT validates and parses a JWT token
func ValidateJWT(tokenString, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// RefreshJWT generates a new token with extended expiry
func RefreshJWT(oldToken, secret string, expiryHours int) (string, error) {
	claims, err := ValidateJWT(oldToken, secret)
	if err != nil {
		return "", fmt.Errorf("invalid token for refresh: %w", err)
	}

	// Generate new token with same claims but new expiry
	return GenerateJWT(claims.UserID, claims.Email, claims.Name, secret, expiryHours)
}

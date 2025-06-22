package utils

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "Valid password",
			password: "password123",
			wantErr:  false,
		},
		{
			name:     "Short password",
			password: "pass",
			wantErr:  true,
		},
		{
			name:     "Empty password",
			password: "",
			wantErr:  true,
		},
		{
			name:     "Long password",
			password: "verylongpasswordthatismorethanreasonable123456789",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("HashPassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && hash == "" {
				t.Error("HashPassword() returned empty hash")
			}
			if !tt.wantErr && hash == tt.password {
				t.Error("HashPassword() returned plain password")
			}
		})
	}
}

func TestCheckPassword(t *testing.T) {
	password := "testpassword123"
	wrongPassword := "wrongpassword"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	tests := []struct {
		name     string
		password string
		hash     string
		wantErr  bool
	}{
		{
			name:     "Correct password",
			password: password,
			hash:     hash,
			wantErr:  false,
		},
		{
			name:     "Wrong password",
			password: wrongPassword,
			hash:     hash,
			wantErr:  true,
		},
		{
			name:     "Empty password",
			password: "",
			hash:     hash,
			wantErr:  true,
		},
		{
			name:     "Invalid hash",
			password: password,
			hash:     "invalid-hash",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckPassword(tt.password, tt.hash)
			if (err != nil) != tt.wantErr {
				t.Errorf("CheckPassword() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "Valid password",
			password: "password123",
			wantErr:  false,
		},
		{
			name:     "Too short",
			password: "pass",
			wantErr:  true,
		},
		{
			name:     "Minimum length",
			password: "123456",
			wantErr:  false,
		},
		{
			name:     "Too long",
			password: string(make([]byte, 101)),
			wantErr:  true,
		},
		{
			name:     "Maximum length",
			password: string(make([]byte, 100)),
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePassword() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

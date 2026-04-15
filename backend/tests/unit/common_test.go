package unit

import (
	"document_editor/pkg/utils"
	testutils "document_editor/tests"
	"time"

	"testing"
)

func TestGenerateDocumentLink(t *testing.T) {
	result := utils.GenerateDocumentLink()

	if len(result) != 20 {
		t.Errorf("GenerateDocumentLink() generated more or less than 20 chars, %d", len(result))
		t.Errorf("generated link: %x", result)
	}

}

func TestCanEdit(t *testing.T) {
	if !utils.CanEdit("owner") {
		t.Errorf("expected owner to have edit access")
	}

	if !utils.CanEdit("read-write") {
		t.Errorf("expected read-write to have edit access")
	}

	if utils.CanEdit("read-only") {
		t.Errorf("expected read-only to not have edit access")
	}
}

func TestGenerateSessionToken(t *testing.T) {
	result := utils.GenerateSessionToken()

	if len(result) != 24 {
		t.Errorf("GenerateSessionToken() generated more or less than 24 chars, %d", len(result))
		t.Errorf("generated token: %x", result)
	}
}

// test generate token for both access token and refrsh token
// NOTE: this test doesn't call GenerateAccessToken() or GenerateRefreshToken() directly
// so if any changes were made inside these function this test may FAIL (i hope it doesn't)
func TestGenerateJwtTokens(t *testing.T) {

	testutils.EnvTest = &testutils.ConfigTest{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "jwt-secret",
	}

	tests := []struct {
		name     string
		secret   string
		duration time.Duration
		min      time.Duration
		max      time.Duration
	}{
		{
			name:     "access token",
			secret:   testutils.EnvTest.JWT_SECRET,
			duration: 30 * time.Minute,
			min:      29 * time.Minute,
			max:      31 * time.Minute,
		},
		{
			name:     "refrsh token",
			secret:   testutils.EnvTest.REFRESH_SECRET,
			duration: 30 * 24 * time.Hour,
			min:      29 * 24 * time.Hour,
			max:      31 * 24 * time.Hour,
		},
	}

	user_id := uint(1)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			token, err := utils.GenerateToken(user_id, tt.secret, tt.duration)

			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}

			if token == "" {
				t.Fatal("expected token string, got empty string")
			}

			claims, err := utils.ParseToken(token, testutils.EnvTest.JWT_SECRET)

			if err != nil {
				t.Fatalf("expected token to parse, got %v", err)
			}

			if claims.UserID != user_id {
				t.Fatalf("expected userID %d, got %d", user_id, claims.UserID)
			}

			if claims.IssuedAt == nil {
				t.Fatal("expected IssuedAt to be set")
			}

			if claims.ExpiresAt == nil {
				t.Fatal("expected ExpiresAt to be set")
			}

			diff := claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time)
			if diff < tt.min || diff > tt.max {
				t.Fatalf("expected expiration around 30 minutes, got %v", diff)
			}
		})
	}
}

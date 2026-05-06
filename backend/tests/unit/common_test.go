package unit

import (
	"bytes"
	"document_editor/pkg/config"
	"document_editor/pkg/utils"
	testutils "document_editor/tests"
	"strings"
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

func TestSendEmail(t *testing.T) {
	originalEnv := config.Env
	config.Env = &config.Config{
		SMTP_HOST:     "smtp.example.com",
		SMTP_PORT:     "587",
		SMTP_EMAIL:    "noreply@example.com",
		SMTP_PASSWORD: "secret",
	}

	t.Cleanup(func() {
		config.Env = originalEnv
	})

	fakeDialer := &utils.FakeEmailDialer{}
	var gotHost string
	var gotPort int
	var gotUsername string
	var gotPassword string

	restoreDialer := utils.UseEmailDialerFactory(func(host string, port int, username, password string) utils.EmailDialer {
		gotHost = host
		gotPort = port
		gotUsername = username
		gotPassword = password
		return fakeDialer
	})
	t.Cleanup(restoreDialer)

	err := utils.SendEmail("user@example.com", "Reset password", "Use this code: 123456")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if gotHost != "smtp.example.com" || gotPort != 587 {
		t.Fatalf("expected smtp.example.com:587, got %s:%d", gotHost, gotPort)
	}

	if gotUsername != "noreply@example.com" || gotPassword != "secret" {
		t.Fatalf("expected configured SMTP credentials to be used, got %s / %s", gotUsername, gotPassword)
	}

	if len(fakeDialer.Messages) != 1 {
		t.Fatalf("expected exactly one message to be sent, got %d", len(fakeDialer.Messages))
	}

	msg := fakeDialer.Messages[0]

	if from := msg.GetHeader("From"); from[0] != "noreply@example.com" {
		t.Fatalf("expected From header to be noreply@example.com, got %v", from)
	}

	if to := msg.GetHeader("To"); to[0] != "user@example.com" {
		t.Fatalf("expected To header to be user@example.com, got %v", to)
	}

	if subject := msg.GetHeader("Subject"); subject[0] != "Reset password" {
		t.Fatalf("expected Subject header to be Reset password, got %v", subject)
	}

	/*
		 NOTE: for future reference
					 gomail.Message doesn't provide a getBody method so the only way to get
					 the message is to serialize it
			msg example :
				MIME-Version: 1.0
				Date: Wed, 06 May 2026 11:05:11 +0100
				From: noreply@example.com
				To: user@example.com
				Subject: Reset password
				Content-Type: text/plain; charset=UTF-8
				Content-Transfer-Encoding: quoted-printable

				Use this code: 123456
	*/

	var raw bytes.Buffer
	if _, err := msg.WriteTo(&raw); err != nil {
		t.Fatalf("expected message to serialize, got %v", err)
	}

	if !strings.Contains(raw.String(), "Use this code: 123456") {
		t.Fatalf("expected email body to contain reset code, got %q", raw.String())
	}
}

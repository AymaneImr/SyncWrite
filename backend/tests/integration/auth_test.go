package integration

import (
	"bytes"
	"document_editor/pkg/config"
	"document_editor/pkg/handlers"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	testutils "document_editor/tests"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type TestCases struct {
	name         string
	body         map[string]string
	expectStatus int
	expectKey    string
	expectValue  string
}

func TestRegisterUser(t *testing.T) {

	cases := []TestCases{
		{
			name: "success",
			body: map[string]string{
				"username":        "test_user",
				"email":           "test_user@example.com",
				"password":        "password.123",
				"confirmPassword": "password.123",
			},
			expectStatus: http.StatusCreated,
			expectKey:    "info",
			expectValue:  "User registered successfully",
		},
		{
			name: "password length less than 5 chars",
			body: map[string]string{
				"username":        "test_user",
				"email":           "test_user@example.com",
				"password":        "1234",
				"confirmPassword": "1234",
			},
			expectStatus: http.StatusBadRequest,
			expectKey:    "error",
			expectValue:  "Password must be at least 5 characters long",
		},
		{
			name: "password mismatch",
			body: map[string]string{
				"username":        "test_user",
				"email":           "test_user@example.com",
				"password":        "password.123",
				"confirmPassword": "password.12",
			},
			expectStatus: http.StatusBadRequest,
			expectKey:    "error",
			expectValue:  "Passwords dont match",
		},
		{
			name: "missing fields",
			body: map[string]string{
				"username": "test_user",
				"email":    "test_user@example.com",
				"password": "password.123",
			},
			expectStatus: http.StatusBadRequest,
			expectKey:    "error",
			expectValue:  "Missing fields",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {

			testDB := openMigratedTestDB(t, "auth_register_test")
			r := testutils.Route{
				Method:   "POST",
				Endpoint: "/api/auth/register",
				Handler:  handlers.RegisterUser,
			}

			router := setupRouter(r)

			payload, err := json.Marshal(tc.body)
			if err != nil {
				t.Fatalf("failed to marshal request body: %v", err)
			}

			req := httptest.NewRequest(r.Method, r.Endpoint, bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			var res map[string]string
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}

			if res[tc.expectKey] != tc.expectValue {
				t.Fatalf("expected %q, got %q", tc.expectValue, res[tc.expectKey])
			}

			if tc.expectStatus != http.StatusCreated {
				return
			}

			var user models.User
			if err := testDB.Where("email = ?", tc.body["email"]).First(&user).Error; err != nil {
				t.Fatalf("user was not registered : %v", err)
			}

			if user.Username != tc.body["username"] {
				t.Fatalf("expected useranme = %q, got %q", tc.body["username"], user.Username)
			}

			if user.IsActive {
				t.Fatal("expected IsActive to be false, got true")
			}

			if user.Password == tc.body["password"] {
				t.Fatal("expected password to be hashed")
			}

			if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(tc.body["password"])); err != nil {
				t.Fatalf("expected passwords to be matched: %v", err)
			}
		})
	}
}

func TestLogin(t *testing.T) {

	cases := []TestCases{
		{
			name: "success",
			body: map[string]string{
				"email":    "test_user@example.com",
				"password": "password.123",
			},
			expectStatus: http.StatusOK,
			expectKey:    "message",
			expectValue:  "Login successful",
		},
		{
			name: "missing fields",
			body: map[string]string{
				"email": "test_user@example.com",
			},
			expectStatus: http.StatusNotFound,
			expectKey:    "error",
			expectValue:  "Missing fields",
		},
		{
			name: "user not found",
			body: map[string]string{
				"email":    "test_user2@example.com",
				"password": "password.123",
			},
			expectStatus: http.StatusNotFound,
			expectKey:    "error",
			expectValue:  "User with this this email doesn't exist",
		},
		{
			name: "wrong password",
			body: map[string]string{
				"email":    "test_user@example.com",
				"password": "password.12",
			},
			expectStatus: http.StatusUnauthorized,
			expectKey:    "error",
			expectValue:  "Wrong password",
		},
	}

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
	}

	r := testutils.Route{
		Method:   "POST",
		Endpoint: "/api/auth/login",
		Handler:  handlers.Login,
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := openMigratedTestDB(t, "auth_login_test")
			router := setupRouter(r)

			test_password := "password.123"
			hashed_password, err := bcrypt.GenerateFromPassword([]byte(test_password), bcrypt.DefaultCost)
			if err != nil {
				t.Fatalf("failed to hash password: %v", err)
			}

			user := models.User{
				Username: "test_user",
				Email:    "test_user@example.com",
				Password: string(hashed_password),
				IsActive: false,
			}

			if err := testDB.Create(&user).Error; err != nil {
				t.Fatalf("failed to create user table: %v", err)
			}

			payload, err := json.Marshal(&tc.body)
			if err != nil {
				t.Fatalf("failed to marshal request body: %v", err)
			}

			req := httptest.NewRequest(r.Method, r.Endpoint, bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			var res map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}

			if res[tc.expectKey] != tc.expectValue {
				t.Fatalf("expected %q, got %q", tc.expectValue, res[tc.expectKey])
			}

			if rec.Code != http.StatusOK {
				return
			}

			if res["access_token"] == "" {
				t.Fatal("expected access_token")
			}

			if res["refresh_token"] == "" {
				t.Fatal("expected refresh_token")
			}

			var user_session models.UserSession
			if err := testDB.Where("user_id = ?", user.ID).First(&user_session).Error; err != nil {
				t.Fatalf("expected user session to be created %v", err)
			}

			if user_session.IsRevoked {
				t.Fatal("expected session to not be revoked")
			}

			access_token, _ := res["access_token"].(string)
			refresh_token, _ := res["refresh_token"].(string)

			if user_session.Token != access_token {
				t.Fatal("expected stored session token to match response access token")
			}

			if user_session.RefreshToken != refresh_token {
				t.Fatal("expected stored refresh token to match response refresh token")
			}
		})
	}

}

func TestRequestPasswordReset(t *testing.T) {

	cases := []TestCases{
		{
			name: "success",
			body: map[string]string{
				"email": "test_user@example.com",
			},
			expectStatus: http.StatusOK,
			expectKey:    "info",
			expectValue:  "A password reset link has been sent, check your mail box",
		},
		{
			name:         "missing fields ",
			body:         map[string]string{},
			expectStatus: http.StatusBadRequest,
			expectKey:    "error",
			expectValue:  "Missing fields",
		},
		{
			name: "user not found ",
			body: map[string]string{
				"email": "not_found_user@example.com",
			},
			expectStatus: http.StatusNotFound,
			expectKey:    "error",
			expectValue:  "User with this Email doesn't exist",
		},
	}

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
		SMTP_HOST:      "smtp.example.com",
		SMTP_PORT:      "587",
		SMTP_EMAIL:     "noreply@example.com",
		SMTP_PASSWORD:  "secret",
	}

	r := testutils.Route{
		Method:   "POST",
		Endpoint: "/api/auth/password-reset/request",
		Handler:  handlers.RequestPasswordReset,
	}

	for _, tc := range cases {

		t.Run(tc.name, func(t *testing.T) {

			testDB := openMigratedTestDB(t, "test_request_password_reset")
			router := setupRouter(r)

			fakeDialer := &utils.FakeEmailDialer{}
			restoreDialer := utils.UseEmailDialerFactory(func(host string, port int, username, password string) utils.EmailDialer {
				return fakeDialer
			})
			t.Cleanup(restoreDialer)

			test_password := "password.123"
			hashed_password, err := bcrypt.GenerateFromPassword([]byte(test_password), bcrypt.DefaultCost)
			if err != nil {
				t.Fatalf("failed to hash password: %v", err)
			}

			user := models.User{
				Username: "test_user",
				Email:    "test_user@example.com",
				Password: string(hashed_password),
				IsActive: false,
			}

			if err := testDB.Create(&user).Error; err != nil {
				t.Fatalf("failed to create user table: %v", err)
			}

			payload, err := json.Marshal(&tc.body)
			if err != nil {
				t.Fatalf("failed to marshal request body: %v", err)
			}

			req := httptest.NewRequest(r.Method, r.Endpoint, bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			var res map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}

			if res[tc.expectKey] != tc.expectValue {
				t.Fatalf("expected %q, got %q", tc.expectValue, res[tc.expectKey])
			}

			if rec.Code != http.StatusOK {
				return
			}

			if len(fakeDialer.Messages) != 1 {
				t.Fatalf("expected only one email to be sent, messages: %d", len(fakeDialer.Messages))
			}

			var resetToken models.PasswordResetToken
			if err := testDB.Where("user_id = ? AND expires_at > ?", user.ID, time.Now().Unix()).First(&resetToken).Error; err != nil {
				t.Fatalf("expected resetToken to be created %v", err)
			}

			if resetToken.UserID != user.ID {
				t.Fatalf("expected reset token user_id = %d, got: %d", user.ID, resetToken.UserID)
			}

			if resetToken.Token == "" {
				t.Fatal("expected reset token not to be empty")
			}

			if resetToken.IsUsed {
				t.Fatal("expected IsUsed to be false")
			}

			now := time.Now().Unix()
			minExpiresAt := now + int64((3 * time.Minute).Seconds()) - 5
			maxExpiresAt := now + int64((3 * time.Minute).Seconds()) + 5

			if resetToken.ExpiresAt < minExpiresAt || resetToken.ExpiresAt > maxExpiresAt {
				t.Fatalf("expected expires_at to be about 3 minutes in the future, got %d", resetToken.ExpiresAt)
			}

		})
	}
}

func TestVerifyPasswordResetToken(t *testing.T) {

	cases := []TestCases{
		{
			name:         "success",
			expectStatus: http.StatusOK,
			expectKey:    "info",
			expectValue:  "Reset token is valid",
		},
		{
			name:         "missing token",
			expectStatus: http.StatusBadRequest,
			expectKey:    "error",
			expectValue:  "Missing token",
		},
		{
			name:         "invalid or expired token",
			expectStatus: http.StatusUnauthorized,
			expectKey:    "error",
			expectValue:  "Invalid or expired reset token",
		},
	}

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
	}

	r := testutils.Route{
		Method:   "GET",
		Endpoint: "/api/auth/password-reset/verify",
		Handler:  handlers.VerifyPasswordResetToken,
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := openMigratedTestDB(t, "test_verify_password_reset")
			router := setupRouter(r)

			rawToken := "valid-reset-token"
			endpoint := r.Endpoint

			user := models.User{
				Username: "test_user",
				Email:    "test_user@example.com",
				Password: "hashed-password",
			}

			if err := testDB.Create(&user).Error; err != nil {
				t.Fatalf("failed to create user: %v", err)
			}

			switch tc.name {
			case "success":
				resetToken := models.PasswordResetToken{
					UserID:    user.ID,
					Token:     utils.HashResetToken(rawToken),
					ExpiresAt: time.Now().Add(3 * time.Minute).Unix(),
					IsUsed:    false,
				}

				if err := testDB.Create(&resetToken).Error; err != nil {
					t.Fatalf("failed to create reset token: %v", err)
				}

				endpoint += "?token=" + rawToken
			case "missing token":
			case "invalid or expired token":
				resetToken := models.PasswordResetToken{
					UserID:    user.ID,
					Token:     utils.HashResetToken(rawToken),
					ExpiresAt: time.Now().Add(-3 * time.Minute).Unix(),
					IsUsed:    false,
				}

				if err := testDB.Create(&resetToken).Error; err != nil {
					t.Fatalf("failed to create expired reset token: %v", err)
				}

				endpoint += "?token=wrong-reset-token"
			}

			req := httptest.NewRequest(r.Method, endpoint, nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			var res map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}

			if res[tc.expectKey] != tc.expectValue {
				t.Fatalf("expected %q, got %q", tc.expectValue, res[tc.expectKey])
			}
		})
	}
}

func TestConfirmPasswordReset(t *testing.T) {
	cases := []TestCases{
		{
			name: "success",
			body: map[string]string{
				"token":           "valid-reset-token",
				"newPassword":     "password.123",
				"confirmPassword": "password.123",
			},
			expectStatus: http.StatusAccepted,
			expectKey:    "info",
			expectValue:  "Password changed successfully",
		},
		{
			name: "missing fields",
			body: map[string]string{
				"token":       "valid-reset-token",
				"newPassword": "password.123",
			},
			expectStatus: http.StatusBadRequest,
			expectKey:    "error",
			expectValue:  "Missing fields",
		},
		{
			name: "password mismatch",
			body: map[string]string{
				"token":           "valid-reset-token",
				"newPassword":     "password.123",
				"confirmPassword": "password.12",
			},
			expectStatus: http.StatusBadRequest,
			expectKey:    "error",
			expectValue:  "Passwords dont match",
		},
		{
			name: "invalid or expired token",
			body: map[string]string{
				"token":           "wrong-reset-token",
				"newPassword":     "password.123",
				"confirmPassword": "password.123",
			},
			expectStatus: http.StatusUnauthorized,
			expectKey:    "error",
			expectValue:  "Invalid or expired reset token",
		},
	}

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
	}

	r := testutils.Route{
		Method:   "POST",
		Endpoint: "/api/auth/password-reset/confirm",
		Handler:  handlers.ConfirmPasswordReset,
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := openMigratedTestDB(t, "test_confirm_password_reset")
			router := setupRouter(r)

			test_password := "password.123"
			hashed_password, err := bcrypt.GenerateFromPassword([]byte(test_password), bcrypt.DefaultCost)
			if err != nil {
				t.Fatalf("failed to hash password: %v", err)
			}

			user := &models.User{
				Username: "test_user",
				Email:    "test_user@example.com",
				Password: string(hashed_password),
			}

			if err := testDB.Create(&user).Error; err != nil {
				t.Fatalf("failed to create user: %v", err)
			}

			rawToken := "valid-reset-token"
			resetToken := models.PasswordResetToken{
				UserID:    user.ID,
				Token:     utils.HashResetToken(rawToken),
				ExpiresAt: time.Now().Add(3 * time.Minute).Unix(),
				IsUsed:    false,
			}

			if err := testDB.Create(&resetToken).Error; err != nil {
				t.Fatalf("failed to create reset token: %v", err)
			}

			if tc.name == "invalid or expired token" {
				if err := testDB.Model(&models.PasswordResetToken{}).
					Where("id = ?", resetToken.ID).
					Update("expires_at", time.Now().Add(-3*time.Minute).Unix()).Error; err != nil {
					t.Fatalf("failed to expire reset token: %v", err)
				}
			}

			payload, err := json.Marshal(&tc.body)
			if err != nil {
				t.Fatalf("failed to marshal request body: %v", err)
			}

			req := httptest.NewRequest(r.Method, r.Endpoint, bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			var res map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}

			if res[tc.expectKey] != tc.expectValue {
				t.Fatalf("expected %q, got %q", tc.expectValue, res[tc.expectKey])
			}

			var updatedUser models.User
			if err := testDB.First(&updatedUser, user.ID).Error; err != nil {
				t.Fatalf("failed to fetch updated user: %v", err)
			}

			var updatedResetToken models.PasswordResetToken
			if err := testDB.First(&updatedResetToken, resetToken.ID).Error; err != nil {
				t.Fatalf("failed to fetch updated reset token: %v", err)
			}

			if tc.expectStatus == http.StatusAccepted {
				if err := bcrypt.CompareHashAndPassword([]byte(updatedUser.Password), []byte(tc.body["newPassword"])); err != nil {
					t.Fatalf("expected password to be updated: %v", err)
				}

				if !updatedResetToken.IsUsed {
					t.Fatal("expected reset token to be marked used")
				}

				return
			}

			if err := bcrypt.CompareHashAndPassword([]byte(updatedUser.Password), []byte(test_password)); err != nil {
				t.Fatalf("expected password to remain unchanged: %v", err)
			}

			if updatedResetToken.IsUsed {
				t.Fatal("expected reset token to remain unused")
			}
		})
	}

}

func TestLogout(t *testing.T) {

	cases := []TestCases{
		{
			name:         "success",
			expectStatus: http.StatusOK,
			expectKey:    "message",
			expectValue:  "Logged out successfully",
		},
		{
			name:         "session expired or revoked",
			expectStatus: http.StatusUnauthorized,
			expectKey:    "error",
			expectValue:  "Session expired or revoked",
		},
	}

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
	}

	r := testutils.Route{
		Method:   "POST",
		Endpoint: "/api/auth/logout",
		Handler: func(r *gin.Context) {
			utils.Auth()(r)
			if r.IsAborted() {
				return
			}
			handlers.Logout(r)
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := openMigratedTestDB(t, "test_logout")
			router := setupRouter(r)

			test_password := "password.123"
			hashed_password, err := bcrypt.GenerateFromPassword([]byte(test_password), bcrypt.DefaultCost)
			if err != nil {
				t.Fatalf("failed to hash password: %v", err)
			}

			user := &models.User{
				Username: "test_user",
				Email:    "test_user@example.com",
				Password: string(hashed_password),
				IsActive: false,
			}

			if err := testDB.Create(&user).Error; err != nil {
				t.Fatalf("failed to create user: %v", err)
			}

			accessToken, err := utils.GenerateAccessToken(user.ID, config.Env.JWT_SECRET)
			refreshToken, err := utils.GenerateRefreshToken(user.ID, config.Env.REFRESH_SECRET)

			userSession := models.UserSession{
				UserID:       user.ID,
				Token:        accessToken,
				RefreshToken: refreshToken,
				IpAddress:    "127.0.0.1",
				UserAgent:    "logout-test",
				CreatedAt:    time.Now().Unix(),
				ExpiresAt:    time.Now().Add(30 * 24 * time.Hour).Unix(),
				IsRevoked:    false,
			}

			if tc.name == "success" {
				if err := testDB.Create(&userSession).Error; err != nil {
					t.Fatalf("failed to create user session: %v", err)
				}
			}

			req := httptest.NewRequest(r.Method, r.Endpoint, nil)
			req.Header.Set("Authorization", "Bearer "+accessToken)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			var res map[string]string
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}

			if res[tc.expectKey] != tc.expectValue {
				t.Fatalf("expected %q, got %q", tc.expectValue, res[tc.expectKey])
			}

			if tc.name != "success" {
				return
			}

			var storedSession models.UserSession
			if err := testDB.First(&storedSession, userSession.ID).Error; err != nil {
				t.Fatalf("failed to reload user session: %v", err)
			}

			if !storedSession.IsRevoked {
				t.Fatal("expected session to be revoked after logout")
			}

		})
	}
}


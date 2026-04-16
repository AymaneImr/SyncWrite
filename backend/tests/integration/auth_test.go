package integration

import (
	"bytes"
	"document_editor/pkg/config"
	"document_editor/pkg/handlers"
	"document_editor/pkg/models"
	testutils "document_editor/tests"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestRegisterUser(t *testing.T) {

	cases := []struct {
		name         string
		body         map[string]string
		expectStatus int
		expectKey    string
		expectValue  string
	}{
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

	cases := []struct {
		name         string
		body         map[string]string
		expectStatus int
		expectKey    string
		expectValue  string
	}{
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

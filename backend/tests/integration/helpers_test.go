package integration

import (
	"bytes"
	"document_editor/pkg/config"
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	testutils "document_editor/tests"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func openTestDB(t *testing.T, schemaPrefix string) *gorm.DB {
	t.Helper()

	testutils.EnvTest = &testutils.ConfigTest{
		DB_URL: "postgres://dev:test_pass@localhost:5431/doc_editor_db_test",
	}

	testDB, err := gorm.Open(postgres.Open(testutils.EnvTest.DB_URL), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect test database failed: %v", err)
	}

	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("get sql db failed: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	t.Cleanup(func() {
		_ = sqlDB.Close()
		if db.Db == testDB {
			db.Db = nil
		}
	})

	schema := fmt.Sprintf("%s_%d", schemaPrefix, time.Now().UnixNano())
	if err := testDB.Exec(`CREATE SCHEMA ` + schema).Error; err != nil {
		t.Fatalf("create test schema failed: %v", err)
	}

	t.Cleanup(func() {
		if err := testDB.Exec(`DROP SCHEMA ` + schema + ` CASCADE`).Error; err != nil {
			t.Fatalf("cleanup failed: %v", err)
		}
	})

	if err := testDB.Exec(`SET search_path TO ` + schema).Error; err != nil {
		t.Fatalf("set search path: %v", err)
	}

	return testDB
}

func openMigratedTestDB(t *testing.T, schemaPrefix string) *gorm.DB {
	t.Helper()

	testDB := openTestDB(t, schemaPrefix)
	if err := db.Migrate(testDB); err != nil {
		t.Fatalf("Migrate() failed: %v", err)
	}
	db.Db = testDB

	return testDB
}

func setupRouter(r testutils.Route, middlewares ...gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	handlerChain := append(middlewares, r.Handler)

	switch r.Method {
	case http.MethodGet:
		router.GET(r.Endpoint, handlerChain...)
	case http.MethodPost:
		router.POST(r.Endpoint, handlerChain...)
	case http.MethodPut:
		router.PUT(r.Endpoint, handlerChain...)
	case http.MethodDelete:
		router.DELETE(r.Endpoint, handlerChain...)
	}

	return router
}

func performRequest(t *testing.T, router *gin.Engine, method string, endpoint string, body any, authHeader string) *httptest.ResponseRecorder {
	t.Helper()

	var reqBody *bytes.Reader

	if body == nil {
		reqBody = bytes.NewReader(nil)
	} else {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		reqBody = bytes.NewReader(payload)
	}

	req := httptest.NewRequest(method, endpoint, reqBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	return rec
}

func checkAuthMiddlewareError(t *testing.T, route testutils.Route, authHeader string, body any, expectStatus int, expectMessage string) {
	t.Helper()

	router := setupRouter(route, utils.Auth())
	rec := performRequest(t, router, route.Method, route.Endpoint, body, authHeader)

	if rec.Code != expectStatus {
		t.Fatalf("expected %d, got %d", expectStatus, rec.Code)
	}

	var res map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to unmarshal response body: %v", err)
	}

	if res["error"] != expectMessage {
		t.Fatalf("expected %q, got %q", expectMessage, res["error"])
	}
}

func ListAuthMiddlewareErrors(t *testing.T, route testutils.Route, body any) {
	t.Helper()

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
	}

	cases := []struct {
		name          string
		authHeader    string
		expectStatus  int
		expectMessage string
		setup         func(t *testing.T) string
	}{
		{
			name:          "missing authorization header",
			authHeader:    "",
			expectStatus:  http.StatusUnauthorized,
			expectMessage: "Missing Authorization header",
		},
		{
			name:          "invalid authorization format",
			authHeader:    "Token invalid-format",
			expectStatus:  http.StatusUnauthorized,
			expectMessage: "Invalid Authorization format",
		},
		{
			name:          "invalid or expired token",
			authHeader:    "Bearer invalid-token",
			expectStatus:  http.StatusUnauthorized,
			expectMessage: "Invalid or expired token",
		},
		{
			name:          "session expired or revoked",
			expectStatus:  http.StatusUnauthorized,
			expectMessage: "Session expired or revoked",
			setup: func(t *testing.T) string {
				testDB := openMigratedTestDB(t, "auth_middleware_revoked_session")

				user := models.User{
					Username: "auth_user",
					Email:    "auth_user@example.com",
					Password: "hashed-password",
					IsActive: true,
				}
				if err := testDB.Create(&user).Error; err != nil {
					t.Fatalf("failed to create user: %v", err)
				}

				accessToken, _ := utils.GenerateAccessToken(user.ID, config.Env.JWT_SECRET)

				return "Bearer " + accessToken
			},
		},
		{
			name:          "user not found",
			expectStatus:  http.StatusUnauthorized,
			expectMessage: "User not found",
			setup: func(t *testing.T) string {
				testDB := openMigratedTestDB(t, "auth_middleware_missing_user")

				user := models.User{
					Username: "auth_user",
					Email:    "auth_user@example.com",
					Password: "hashed-password",
					IsActive: true,
				}
				if err := testDB.Create(&user).Error; err != nil {
					t.Fatalf("failed to create user: %v", err)
				}

				accessToken, _ := utils.GenerateAccessToken(1234, config.Env.JWT_SECRET)
				refreshToken, _ := utils.GenerateRefreshToken(1234, config.Env.REFRESH_SECRET)

				userSession := models.UserSession{
					UserID:       user.ID,
					Token:        accessToken,
					RefreshToken: refreshToken,
					IpAddress:    "localhost",
					UserAgent:    "auth-middleware-test",
					CreatedAt:    time.Now().Unix(),
					ExpiresAt:    time.Now().Add(30 * time.Minute).Unix(),
					IsRevoked:    false,
				}
				if err := testDB.Create(&userSession).Error; err != nil {
					t.Fatalf("failed to create user session: %v", err)
				}

				return "Bearer " + accessToken
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {

			authHeader := tc.authHeader
			if tc.setup != nil {
				authHeader = tc.setup(t)
			}

			checkAuthMiddlewareError(
				t,
				route,
				authHeader,
				body,
				tc.expectStatus,
				tc.expectMessage,
			)
		})
	}
}

func createUserWithUserSession(t *testing.T, schemaPrefix string) (models.User, string) {
	t.Helper()

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
	}

	testDB := openMigratedTestDB(t, schemaPrefix)

	user := models.User{
		Username: "test_user",
		Email:    "test_user@example.com",
		Password: "hashed-password",
		IsActive: true,
	}
	if err := testDB.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	accessToken, err := utils.GenerateAccessToken(user.ID, config.Env.JWT_SECRET)
	if err != nil {
		t.Fatalf("failed to generate access token: %v", err)
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID, config.Env.REFRESH_SECRET)
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}

	userSession := models.UserSession{
		UserID:       user.ID,
		Token:        accessToken,
		RefreshToken: refreshToken,
		IpAddress:    "127.0.0.1",
		UserAgent:    "integration-test",
		CreatedAt:    time.Now().Unix(),
		ExpiresAt:    time.Now().Add(30 * time.Minute).Unix(),
		IsRevoked:    false,
	}
	if err := testDB.Create(&userSession).Error; err != nil {
		t.Fatalf("failed to create user session: %v", err)
	}

	return user, accessToken
}

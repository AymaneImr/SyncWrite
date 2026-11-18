package integration

import (
	"document_editor/pkg/config"
	"document_editor/pkg/db"
	"document_editor/pkg/handlers"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	testutils "document_editor/tests"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"
)

func TestCreateDocument(t *testing.T) {

	cases := []TestCases{
		{
			name: "success",
			body: map[string]any{
				"title": "newDoc",
			},
			expectStatus: http.StatusOK,
			expectKey:    "message",
			expectValue:  "Document created",
		},
		{
			name: "empty title",
			body: map[string]any{
				"title": "",
			},
			expectStatus: http.StatusOK,
			expectKey:    "message",
			expectValue:  "Document created",
		},
	}

	r := testutils.Route{
		Method:   http.MethodPost,
		Endpoint: "/api/documents/create",
		Handler:  handlers.CreateDocument,
	}

	t.Run("auth middleware failures cases", func(t *testing.T) {
		ListAuthMiddlewareErrors(t, r,
			map[string]string{
				"title": "newDoc",
			})
	})

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			user, accessToken := createUserWithUserSession(t, "create_document_test")
			router := setupRouter(r, utils.Auth())

			rec := performRequest(t, router, r.Method, r.Endpoint, tc.body, "Bearer "+accessToken)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			var res map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}

			if res[tc.expectKey] != tc.expectValue {
				t.Fatalf("expected %q, got %v", tc.expectValue, res[tc.expectKey])
			}

			var doc models.Document
			if err := db.Db.Where("owner_id = ?", user.ID).First(&doc).Error; err != nil {
				t.Fatalf("failed to load created document: %v", err)
			}

			expectedTitle := tc.body["title"]
			if expectedTitle == "" || expectedTitle == " " {
				expectedTitle = "Untitled"
			}

			if doc.Title != expectedTitle {
				t.Fatalf("expected title %q, got %q", expectedTitle, doc.Title)
			}

			if doc.OwnerID != user.ID {
				t.Fatalf("expected owner id %d, got %d", user.ID, doc.OwnerID)
			}

			if doc.Link == "" {
				t.Fatal("expected generated document link")
			}

			var docSession models.DocumentSession
			if err := db.Db.Where("document_id = ? AND user_id = ?", doc.ID, user.ID).First(&docSession).Error; err != nil {
				t.Fatalf("failed to load document session: %v", err)
			}

			if docSession.IsRevoked {
				t.Fatal("expected document session to be active")
			}
		})
	}
}

func TestLoadDocument(t *testing.T) {
	r := testutils.Route{
		Method:   http.MethodGet,
		Endpoint: "/api/documents/:id/load",
		Handler:  handlers.LoadDocument,
	}

	config.Env = &config.Config{
		JWT_SECRET:     "jwt-secret",
		REFRESH_SECRET: "refresh-secret",
	}

	t.Run("auth middleware failures cases", func(t *testing.T) {
		ListAuthMiddlewareErrors(t, r, nil)
	})

	type loadDocumentCase struct {
		endpoint   string
		authHeader string
		docID      uint
		title      string
		ownerID    uint
	}

	cases := []struct {
		name         string
		setup        func(t *testing.T) loadDocumentCase
		expectStatus int
		expectError  string
	}{
		{
			name: "success as owner",
			setup: func(t *testing.T) loadDocumentCase {
				user, accessToken := createUserWithUserSession(t, "load_doc_owner")
				doc := createDocument(t, db.Db, user.ID)

				return loadDocumentCase{
					endpoint:   fmt.Sprintf("/api/documents/%d/load", doc.ID),
					authHeader: "Bearer " + accessToken,
					docID:      doc.ID,
					title:      doc.Title,
					ownerID:    user.ID,
				}
			},
			expectStatus: http.StatusOK,
		},
		{
			name: "document not found",
			setup: func(t *testing.T) loadDocumentCase {
				_, accessToken := createUserWithUserSession(t, "load_doc_not_found")

				return loadDocumentCase{
					endpoint:   "/api/documents/9999/load",
					authHeader: "Bearer " + accessToken,
				}
			},
			expectStatus: http.StatusNotFound,
			expectError:  "Document not found",
		},
		{
			name: "collaborator with active session",
			setup: func(t *testing.T) loadDocumentCase {
				testDB := openMigratedTestDB(t, "load_doc_collab_active")
				owner, user := createOwnerAndUser(t, testDB)
				doc := createDocument(t, testDB, owner.ID)

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
					UserAgent:    "load-doc-test",
					CreatedAt:    time.Now().Unix(),
					ExpiresAt:    time.Now().Add(30 * time.Minute).Unix(),
					IsRevoked:    false,
				}
				if err := testDB.Create(&userSession).Error; err != nil {
					t.Fatalf("failed to create user session: %v", err)
				}

				createDocumentSession(t, testDB, user.ID, doc.ID)

				collaborator := models.DocumentCollaborator{
					DocumentID: doc.ID,
					UserID:     user.ID,
					Permission: models.ReadOnly,
					InvitedBy:  owner.ID,
				}
				if err := testDB.Create(&collaborator).Error; err != nil {
					t.Fatalf("failed to create collaborator: %v", err)
				}

				return loadDocumentCase{
					endpoint:   fmt.Sprintf("/api/documents/%d/load", doc.ID),
					authHeader: "Bearer " + accessToken,
					docID:      doc.ID,
					title:      doc.Title,
					ownerID:    owner.ID,
				}
			},
			expectStatus: http.StatusOK,
		},
		{
			name: "collaborator without active session",
			setup: func(t *testing.T) loadDocumentCase {
				testDB := openMigratedTestDB(t, "load_doc_collab_no_session")
				owner, user := createOwnerAndUser(t, testDB)
				doc := createDocument(t, testDB, owner.ID)

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
					UserAgent:    "load-doc-test",
					CreatedAt:    time.Now().Unix(),
					ExpiresAt:    time.Now().Add(30 * time.Minute).Unix(),
					IsRevoked:    false,
				}
				if err := testDB.Create(&userSession).Error; err != nil {
					t.Fatalf("failed to create user session: %v", err)
				}

				collaborator := models.DocumentCollaborator{
					DocumentID: doc.ID,
					UserID:     user.ID,
					Permission: models.ReadOnly,
					InvitedBy:  owner.ID,
				}
				if err := testDB.Create(&collaborator).Error; err != nil {
					t.Fatalf("failed to create collaborator: %v", err)
				}

				return loadDocumentCase{
					endpoint:   fmt.Sprintf("/api/documents/%d/load", doc.ID),
					authHeader: "Bearer " + accessToken,
				}
			},
			expectStatus: http.StatusUnauthorized,
			expectError:  "Document session expired",
		},
		{
			name: "no access as non-owner non-collaborator",
			setup: func(t *testing.T) loadDocumentCase {
				testDB := openMigratedTestDB(t, "load_doc_no_access")
				owner, user := createOwnerAndUser(t, testDB)
				doc := createDocument(t, testDB, owner.ID)

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
					UserAgent:    "load-doc-test",
					CreatedAt:    time.Now().Unix(),
					ExpiresAt:    time.Now().Add(30 * time.Minute).Unix(),
					IsRevoked:    false,
				}
				if err := testDB.Create(&userSession).Error; err != nil {
					t.Fatalf("failed to create user session: %v", err)
				}

				createDocumentSession(t, testDB, user.ID, doc.ID)

				return loadDocumentCase{
					endpoint:   fmt.Sprintf("/api/documents/%d/load", doc.ID),
					authHeader: "Bearer " + accessToken,
				}
			},
			expectStatus: http.StatusForbidden,
			expectError:  "You do not have access to this document",
		},
	}

	router := setupRouter(r, utils.Auth(), utils.DocumentAccess())

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			data := tc.setup(t)

			rec := performRequest(t, router, r.Method, data.endpoint, nil, data.authHeader)

			if rec.Code != tc.expectStatus {
				t.Fatalf("expected %d, got %d", tc.expectStatus, rec.Code)
			}

			if tc.expectError != "" {
				var res map[string]string
				if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}

				if res["error"] != tc.expectError {
					t.Fatalf("expected %q, got %q", tc.expectError, res["error"])
				}

				return
			}

			var res map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			docData, ok := res["document"]
			if !ok {
				t.Fatal("expected document key in response")
			}

			docMap, ok := docData.(map[string]any)
			if !ok {
				t.Fatal("expected document to be an object")
			}

			if docMap["id"] != float64(data.docID) {
				t.Fatalf("expected document id %d, got %v", data.docID, docMap["id"])
			}

			if docMap["title"] != data.title {
				t.Fatalf("expected title %q, got %v", data.title, docMap["title"])
			}

			if docMap["owner_id"] != float64(data.ownerID) {
				t.Fatalf("expected owner_id %d, got %v", data.ownerID, docMap["owner_id"])
			}
		})
	}
}

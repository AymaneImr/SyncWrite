package integration

import (
	"document_editor/pkg/db"
	"document_editor/pkg/handlers"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	testutils "document_editor/tests"
	"encoding/json"
	"net/http"
	"testing"
)

func TestCreateDocument(t *testing.T) {

	cases := []TestCases{
		{
			name: "success",
			body: map[string]string{
				"title": "newDoc",
			},
			expectStatus: http.StatusOK,
			expectKey:    "message",
			expectValue:  "Document created",
		},
		{
			name: "empty title",
			body: map[string]string{
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

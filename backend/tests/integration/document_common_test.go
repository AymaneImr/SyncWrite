package integration

import (
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	"testing"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// TODO: move it to testutils.go
// maybe change the name as well
type setupFunctionReturn struct {
	// more fields will be added with each test use case

	userID uint
	docID  uint
}

func TestCredentialsExists(t *testing.T) {
	cases := []TestCases{
		{
			name: "success",
			body: map[string]any{
				"username": "test_user",
				"email":    "test_user@example.com",
			},
			expectStatus: 1,
		},
		{
			name: "user_not_found",
			body: map[string]any{
				"username": "test_user_not_found",
				"email":    "test_user_not_found@example.com",
			},
			expectStatus: 0,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := openMigratedTestDB(t, "credentials_exists_test")

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

			if err := testDB.Create(user).Error; err != nil {
				t.Fatalf("failed to create user table: %v", err)
			}

			exists, err := utils.CredentialsExists(tc.body["username"].(string), tc.body["email"].(string))

			if err != nil {
				t.Fatalf("expected CredentialsExists() not to fail, got err: %v", err)
			}

			if exists != (tc.expectStatus == 1) {
				t.Fatalf("expected exits to be %d, got %t", tc.expectStatus, exists)
			}

		})
	}
}

func TestHasDocumentAccess(t *testing.T) {
	cases := []TestCases{
		{
			name: "owner access",
			setup: func(t *testing.T, db *gorm.DB) setupFunctionReturn {
				t.Helper()

				owner, _ := createDocumentAccessUsers(t, db)
				document := createDocumentAccessDocument(t, db, owner.ID)

				return setupFunctionReturn{
					userID: owner.ID,
					docID:  document.ID,
				}
			},
			expectStatus: 1,
		},
		{
			name: "collaborator access",
			setup: func(t *testing.T, db *gorm.DB) setupFunctionReturn {
				t.Helper()

				owner, user := createDocumentAccessUsers(t, db)
				document := createDocumentAccessDocument(t, db, owner.ID)
				collaborator := &models.DocumentCollaborator{
					DocumentID: document.ID,
					UserID:     user.ID,
					Permission: models.ReadOnly,
					InvitedBy:  owner.ID,
				}

				if err := db.Create(collaborator).Error; err != nil {
					t.Fatalf("failed to create document collaborator: %v", err)
				}

				return setupFunctionReturn{
					userID: user.ID,
					docID:  document.ID,
				}
			},
			expectStatus: 1,
		},
		{
			name: "document not found",
			setup: func(t *testing.T, db *gorm.DB) setupFunctionReturn {
				t.Helper()

				_, user := createDocumentAccessUsers(t, db)

				return setupFunctionReturn{
					userID: user.ID,
					docID:  12,
				}
			},
			expectStatus: 0,
		},
		{
			name: "no access",
			setup: func(t *testing.T, db *gorm.DB) setupFunctionReturn {
				t.Helper()

				owner, user := createDocumentAccessUsers(t, db)
				document := createDocumentAccessDocument(t, db, owner.ID)

				return setupFunctionReturn{
					userID: user.ID,
					docID:  document.ID,
				}
			},
			expectStatus: 0,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := openMigratedTestDB(t, "has_document_access_test")

			data := tc.setup(t, testDB)
			hasAccess := utils.HasDocumentAccess(data.userID, data.docID)

			if hasAccess != (tc.expectStatus == 1) {
				t.Fatalf("expected access to be %d, got %t", tc.expectStatus, hasAccess)
			}
		})
	}

}

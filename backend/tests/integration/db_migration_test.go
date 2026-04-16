package integration

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"

	"testing"
)

func TestMigrateModels(t *testing.T) {
	testDB := openTestDB(t, "migration_test")

	if err := db.Migrate(testDB); err != nil {
		t.Fatalf("Migrate() failed: %v", err)
	}

	test_models := []struct {
		name  string
		model any
	}{
		{"user table", &models.User{}},
		{"user session table", &models.UserSession{}},
		{"document table", &models.Document{}},
		{"document session table", &models.DocumentSession{}},
		{"document collaborator table", &models.DocumentCollaborator{}},
		{"document event table", &models.DocumentEvent{}},
	}

	for _, tt := range test_models {
		t.Run(tt.name, func(t *testing.T) {
			if !testDB.Migrator().HasTable(tt.model) {
				t.Fatalf("expected table for %T to exist", tt.model)
			}
		})
	}

}

package integration

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	testutils "document_editor/tests"

	"fmt"
	"testing"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestMigrateModels(t *testing.T) {
	testutils.EnvTest = &testutils.ConfigTest{
		DB_URL: "postgres://dev:test_pass@localhost:5432/doc_editor_db_test",
	}

	testDB, err := gorm.Open(postgres.Open(testutils.EnvTest.DB_URL), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect test database failed: %v", err)
	}

	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("get sql db failed: %v", err)
	}

	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	schema := fmt.Sprintf("migration_test_%d", time.Now().UnixNano())
	if err := testDB.Exec(`CREATE SCHEMA ` + schema).Error; err != nil {
		t.Fatalf("create test schema failed %v", err)
	}

	t.Cleanup(func() {
		if err = testDB.Exec(`DROP SCHEMA ` + schema + ` CASCADE`).Error; err != nil {
			t.Fatalf("cleanup failed: %v", err)
		}
	})

	if err := testDB.Exec(`SET search_path To ` + schema).Error; err != nil {
		t.Fatalf("set search path: %v", err)
	}

	if err := db.Migrate(testDB); err != nil {
		t.Fatalf("Migrate() failed: %v", err)
	}

	models := []struct {
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

	for _, tt := range models {
		t.Run(tt.name, func(t *testing.T) {
			if !testDB.Migrator().HasTable(tt.model) {
				t.Fatalf("expected table for %T to exist", tt.model)
			}
		})
	}

}

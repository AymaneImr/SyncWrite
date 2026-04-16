package integration

import (
	"document_editor/pkg/db"
	testutils "document_editor/tests"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func openTestDB(t *testing.T, schemaPrefix string) *gorm.DB {
	t.Helper()

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

func setupRouter(r testutils.Route) *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	switch r.Method {
	case http.MethodGet:
		router.GET(r.Endpoint, r.Handler)
	case http.MethodPost:
		router.POST(r.Endpoint, r.Handler)
	case http.MethodPut:
		router.PUT(r.Endpoint, r.Handler)
	case http.MethodDelete:
		router.DELETE(r.Endpoint, r.Handler)
	}

	return router
}

package db

import (
	"document_editor/pkg/models"

	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var Db *gorm.DB

func ConnectDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn))
	if err != nil {
		return nil, err
	}

	sqldb, err := db.DB()
	if err != nil {
		return nil, err
	}

	err = sqldb.Ping()
	if err != nil {
		return nil, err
	}

	log.Println("Database connected successfully")
	Db = db

	return db, nil
}

func Migrate(db *gorm.DB) error {

	models := []any{
		&models.User{},
		&models.UserSession{},
		&models.Document{},
		&models.DocumentSession{},
		&models.DocumentCollaborator{},
		&models.DocumentEvent{},
	}

	for _, model := range models {
		err := db.AutoMigrate(model)
		if err != nil {
			return err
		}

		log.Printf("Created table for: %T", model)
	}

	log.Println("All tables created successfully!")
	return nil
}

package main

import (
	"document_editor/pkg/config"
	"document_editor/pkg/db"

	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	config.LoadConfig()

	dsn := config.Env.DB_URL

	dbb, err := db.ConnectDB(dsn)
	if err != nil {
		log.Fatal("Database connection failed:", err)
	}

	err = db.Migrate(dbb)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	RegisterRoutes(r)

	r.Run(":8080")

}

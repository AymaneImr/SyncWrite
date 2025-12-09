package main

import (
	"document_editor/pkg/handlers"
	"document_editor/pkg/utils"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {

	// Auth routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", handlers.RegisterUser)
		auth.POST("/login", handlers.Login)
		auth.POST("/resetPassword", handlers.ChnagePassword)
		auth.POST("/logout", utils.Auth(), handlers.Logout)
	}

	// Document routes
	docs := r.Group("api/documents")
	docs.Use(utils.Auth())
	{
		docs.POST("/create", handlers.CreateDocument)
		docs.GET("/load/:id", handlers.LoadDocument)
		docs.GET("/load/:id", handlers.LoadDocuments)
		docs.PUT("/update/:id", handlers.UpdateDocument)
		docs.DELETE("/delete/:id", handlers.DeleteDocument)
		//docs.PUT("/save/:id", handlers.SaveDocument)
	}

}

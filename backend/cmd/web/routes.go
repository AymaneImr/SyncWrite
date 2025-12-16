package main

import (
	"document_editor/pkg/handlers"
	"document_editor/pkg/utils"
	"document_editor/ws"

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
		docs.GET("/:id/load", utils.DocumentAccess(), handlers.LoadDocument)
		docs.GET("/:id/loadAll", handlers.LoadDocuments)
		docs.GET("/link/:link/open", utils.Auth(), handlers.OpenByLink)
		docs.PUT("/:id/updateTitle", utils.DocumentAccess(), handlers.UpdateTitle)
		docs.PUT("/:id/UpdateContent", utils.DocumentAccess(), handlers.UpdateContent)
		docs.DELETE("/:id/delete", utils.DocumentAccess(), handlers.DeleteDocument)

		docs.PUT("/:id/session/start", utils.DocumentAccess(), handlers.StartDocumentSession)
		docs.PUT("/:id/session/end", utils.DocumentAccess(), handlers.EndDocumentSession)
		docs.GET("/:id/session/active", utils.DocumentAccess(), handlers.GetActiveUsers)
		//docs.PUT("/save/:id", handlers.SaveDocument)
	}

	// Document's Collaborators routes (share docs links)
	share := r.Group("api/documents/:id")
	share.Use(utils.Auth())
	{
		share.POST("/invite", utils.DocumentAccess(), handlers.InviteUser)
		share.GET("/collaborators", utils.DocumentAccess(), handlers.GetCollaborators)
		share.PUT("/:userId/collaborator", utils.DocumentAccess(), handlers.UpdateCollaboratorPermission)
		share.DELETE("/:userId/collaborator", utils.DocumentAccess(), handlers.DeleteColabborator)
	}

	hub := ws.NewHub()
	go hub.Run()

	wsGroup := r.Group("/ws")
	wsGroup.Use(utils.Auth())
	wsGroup.Use(utils.DocumentAccess())
	{
		wsGroup.GET("/document/:id", ws.DocumentWebSocket(hub))
	}

}

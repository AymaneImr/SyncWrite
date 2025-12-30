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
		auth.POST("/register", handlers.RegisterUser)        // works
		auth.POST("/login", handlers.Login)                  // works
		auth.POST("/resetPassword", handlers.ChnagePassword) // works
		auth.POST("/logout", utils.Auth(), handlers.Logout)  // works
	}

	// Document routes
	docs := r.Group("api/documents")
	docs.Use(utils.Auth())
	{
		docs.POST("/create", handlers.CreateDocument)                                  // works
		docs.GET("/:id/load", utils.DocumentAccess(), handlers.LoadDocument)           // works
		docs.GET("/loadAll", handlers.LoadDocuments)                                   // wORKS
		docs.GET("/link/:link/open", utils.Auth(), handlers.OpenByLink)                // works
		docs.PUT("/:id/updateTitle", utils.DocumentAccess(), handlers.UpdateTitle)     // works
		docs.PUT("/:id/updateContent", utils.DocumentAccess(), handlers.UpdateContent) // works
		docs.DELETE("/:id/delete", utils.DocumentAccess(), handlers.DeleteDocument)    // works

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
	{
		wsGroup.GET("/document/:id", ws.DocumentWebSocket(hub))
	}

}

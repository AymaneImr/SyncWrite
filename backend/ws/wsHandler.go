package ws

import (
	"document_editor/pkg/config"
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func DocumentWebSocket(hub *Hub) gin.HandlerFunc {
	return func(r *gin.Context) {

		doc_idStr := r.Param("id")
		docid64, _ := strconv.ParseUint(doc_idStr, 10, 64)
		doc_id := uint(docid64)

		tokenString := r.Query("token")
		if tokenString == "" {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		claims, err := utils.ParseToken(tokenString, config.Env.JWT_SECRET)
		if err != nil {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		if !utils.HasDocumentAccess(claims.UserID, doc_id) {
			r.JSON(http.StatusForbidden, gin.H{"error": "no access to document"})
			return
		}

		accessLevel := "read-only"

		var doc models.Document
		if err := db.Db.Select("id, owner_id").Where("id = ?", doc_id).First(&doc).Error; err != nil {
			r.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return
		}

		if doc.OwnerID == claims.UserID {
			accessLevel = "owner"
		} else {
			var collaborator models.DocumentCollaborator
			if err := db.Db.
				Select("permission").
				Where("document_id = ? AND user_id = ?", doc_id, claims.UserID).
				First(&collaborator).Error; err != nil {
				r.JSON(http.StatusForbidden, gin.H{"error": "no access to document"})
				return
			}

			accessLevel = collaborator.Permission
		}

		if !utils.HasActiveDocumentSession(claims.UserID, doc_id) {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "document session expired"})
			return
		}

		var user models.User
		if err := db.Db.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}

		/*
			access := r.GetString("access_level")
			fmt.Println(access)
			if access == "" {
				r.JSON(http.StatusForbidden, gin.H{"error": "No access"})
				fmt.Println("no access")
				return
			}*/

		conn, err := upgrader.Upgrade(r.Writer, r.Request, nil)
		if err != nil {
			r.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't upgrade to websocket"})
			return
		}

		client := &Client{
			Conn:       conn,
			Send:       make(chan []byte, 256),
			UserID:     claims.UserID,
			DocumentID: doc_id,
			Username:   user.Username,
			Access:     accessLevel,
			Hub:        hub,
		}

		hub.Register <- client

		go client.WritePump()
		go client.ReadPump()

	}

}

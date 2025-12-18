package ws

import (
	"document_editor/pkg/config"
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

		username := r.GetString("username")

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

		access := r.GetString("access_level")
		if access == "" {
			r.JSON(http.StatusForbidden, gin.H{"error": "No access"})
			return
		}

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
			Username:   username,
			Hub:        hub,
		}

		hub.Register <- client

		go client.WritePump()
		go client.ReadPump()

	}

}

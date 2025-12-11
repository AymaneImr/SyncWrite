package ws

import (
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

		user_id := r.GetUint("user_id")
		username := r.GetString("username")

		doc_idStr := r.Param("id")
		docid64, _ := strconv.ParseUint(doc_idStr, 10, 64)
		doc_id := uint(docid64)

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
			UserID:     user_id,
			DocumentID: doc_id,
			Username:   username,
			Hub:        hub,
		}

		hub.Register <- client

		go client.WritePump()
		go client.ReadPump()

	}

}

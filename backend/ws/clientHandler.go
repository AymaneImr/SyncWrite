package ws

import (
	"document_editor/pkg/utils"
	"encoding/json"

	"github.com/gorilla/websocket"
)

func (c *Client) ReadPump() {
	defer func() {
		_ = utils.RevokeDocumentSession(c.UserID, c.DocumentID)
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		if !utils.HasActiveDocumentSession(c.UserID, c.DocumentID) {
			break
		}

		var WSMessage WsData
		if err := json.Unmarshal(msg, &WSMessage); err != nil {
			break
		}

		WSMessage.UserID = c.UserID
		WSMessage.Username = c.Username
		WSMessage.DocumentID = c.DocumentID

		c.Hub.Broadcast <- WSMessage
	}
}

func (c *Client) WritePump() {

	for msg := range c.Send {
		c.Conn.WriteMessage(websocket.TextMessage, msg)
	}
}

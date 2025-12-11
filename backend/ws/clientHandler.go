package ws

import "github.com/gorilla/websocket"

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		c.Hub.Broadcast <- Message{
			DocumentID: c.DocumentID,
			Data:       msg,
		}
	}
}

func (c *Client) WritePump() {

	for msg := range c.Send {
		c.Conn.WriteMessage(websocket.TextMessage, msg)
	}
}

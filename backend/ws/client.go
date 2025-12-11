package ws

import "github.com/gorilla/websocket"

type Client struct {
	Conn       *websocket.Conn
	Send       chan []byte
	UserID     uint
	DocumentID uint
	Username   string
	Hub        *Hub
}

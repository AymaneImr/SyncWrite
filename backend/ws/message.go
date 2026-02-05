package ws

import "encoding/json"

type WsData struct {
	// fields injected by frontend
	Event   string          `json:"event"`
	From    int             `json:"from"`
	To      int             `json:"to"`
	Content json.RawMessage `json:"content"`

	// fields injectecd by backend
	UserID     uint   `json:"user_id"`
	Username   string `json:"username"`
	DocumentID uint   `json:"document_id"`
}

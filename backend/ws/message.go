package ws

type WsData struct {
	// fields injected by frontend
	Event    string `json:"event"`
	Position int    `json:"position"`

	// fields injectecd by backend
	UserID     uint   `json:"user_id"`
	Username   string `json:"username"`
	DocumentID uint   `json:"document_id"`
}

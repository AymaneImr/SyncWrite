package ws

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"encoding/json"
	"fmt"
)

type Hub struct {
	Rooms      map[uint]map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan WsData
}

func NewHub() *Hub {
	return &Hub{
		Rooms:      make(map[uint]map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan WsData),
	}
}

func (h *Hub) Run() {
	for {
		select {

		case client := <-h.Register:
			if h.Rooms[client.DocumentID] == nil {
				h.Rooms[client.DocumentID] = make(map[*Client]bool)
			}

			h.Rooms[client.DocumentID][client] = true

			joinEvent := fmt.Sprintf(
				`{"event": "user joined", "user_id": %d, "username": "%s"}`,
				client.UserID,
				client.Username,
			)

			for c := range h.Rooms[client.DocumentID] {
				c.Send <- []byte(joinEvent)
			}

			// NOTE: DocumentEvent table will be used for analytics activity feed later
			// it doesnt render any event
			db.Db.Create(&models.DocumentEvent{
				DocumentID: client.DocumentID,
				UserID:     client.UserID,
				Username:   client.Username,
				Event:      models.Joined,
				Data:       nil,
			})

		case client := <-h.Unregister:
			if _, ok := h.Rooms[client.DocumentID][client]; ok {

				leaveEvent := fmt.Sprintf(
					`{"event": "user left", "user_id": %d, "username": "%s"}`,
					client.UserID,
					client.Username,
				)

				for c := range h.Rooms[client.DocumentID] {
					c.Send <- []byte(leaveEvent)
				}

				// NOTE: DocumentEvent table will be used for analytics activity feed later
				// it doesnt render any event
				db.Db.Create(&models.DocumentEvent{
					DocumentID: client.DocumentID,
					UserID:     client.UserID,
					Username:   client.Username,
					Event:      models.Left,
					Data:       nil,
				})

				delete(h.Rooms[client.DocumentID], client)
				close(client.Send)
			}

		case msg := <-h.Broadcast:
			payload, _ := json.Marshal(msg)

			for client := range h.Rooms[msg.DocumentID] {
				client.Send <- payload
			}
		}
	}
}

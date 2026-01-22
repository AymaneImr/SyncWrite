package models

import (
	"encoding/json"
)

type Document struct {
	ID           uint   `gorm:"primaryKey; not null; unique; autoIncrement" json:"id"`
	OwnerID      uint   `gorm:"not null; index" json:"owner_id"`
	Title        string `gorm:"type:text; size:20; default:untitled" json:"title"`
	Content      string `gorm:"type:text" json:"Content"`
	Link         string `gorm:"type:text; not null; unique" json:"link"`
	CreatedAt    int64  `gorm:"autoCreateTime:milli; not null" json:"created_at"`
	LastEditedBy string `gorm:"type:text;" json:"last_edited_by"`
	UpdatedAt    int64  `gorm:"type:int8;" json:"updated_at"`

	Session        []DocumentSession      `gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE"`
	Collaborators  []DocumentCollaborator `gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE"`
	DocumentEvents []DocumentEvent        `gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE"`
	//Operations    []Operation            `gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE"`
}

type DocumentSession struct {
	ID            uint   `gorm:"primaryKey; not null; autoIncrement; unique" json:"id"`
	DocumentID    uint   `gorm:"not null; index" json:"document_id"`
	Token         string `gorm:"type:text; not null; unique" json:"token"`
	UserID        uint   `gorm:"not null; index" json:"user_id"`
	NumberOfUsers int8   `gorm:"type:int8" json:"number_of_users"`
	CreatedAt     int64  `gorm:"autoCreateTime:milli; not null" json:"created_at"`
	ExpiresAt     int64  `gorm:"type:int8; not null" json:"expires_at"`
}

// Permissions
const (
	ReadOnly  = "read-only"
	ReadWrite = "read-write"
	// Add moderator role later
)

type DocumentCollaborator struct {
	ID         uint   `gorm:"primaryKey; not null; autoIncrement; unique" json:"id"`
	DocumentID uint   `gorm:"not null; index" json:"document_id"`
	UserID     uint   `gorm:"not null; index" json:"user_id"`
	Permission string `gorm:"not null; default:read-only" json:"permission"`
	InvitedBy  uint   `gorm:"not null; index" json:"invited_by"`
	InvitedAt  int64  `gorm:"autoCreateTime; not null" json:"invited_at"`
	JoinedAt   int64  `gorm:"autoCreateTime; not null" json:"joined_at"`
}

// Events
const (
	Joined = "joined"
	Left   = "left"
	Cursor = "cursor"
)

type DocumentEvent struct {
	ID         uint            `gorm:"primaryKey; not null; autoIncrement; unique" json:"id"`
	DocumentID uint            `gorm:"not null; index" json:"document_id"`
	UserID     uint            `gorm:"not null; index" json:"user_id"`
	Username   string          `gorm:"size: 15; not null" json:"username"`
	Event      string          `gorm:"not null" json:"event"`
	Data       json.RawMessage `gorm:"type:json" json:"data"`
}

const (
	Insert = "insert"
	Delete = "delete"
	Format = "format"
)

type Operation struct {
	UserID        uint   `gorm:"not null; index" json:"user_id"`
	DocumentID    uint   `gorm:"not null; index" json:"document_id"`
	OperationType string `gorm:"not null" json:"operation_type"`
	Position      int8   `gorm:"not null" json:"position"`
	Text          string `gorm:"type:text" json:"text"`
	Length        int8   `gorm:"type:int8" json:"length"`
	Attribute     string `gorm:"type:text" json:"attribute"`
	TimeStamp     int64  `gorm:"autoCreateTime:mili" json:"timestamp"`
}

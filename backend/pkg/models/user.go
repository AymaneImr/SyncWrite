package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	ID       uint   `gorm:"primaryKey; not null; autoIncrement; unique" json:"id"`
	Username string `gorm:"type:text; size:15; not null" json:"username"`
	Email    string `gorm:"type:text; size:40; not null; unique" json:"email"`
	Password string `gorm:"type:text; size:250; not null" json:"password"`
	IsActive bool   `gorm:"type:bool; not null" json:"is_active"`
	Created  int64  `gorm:"autoCreateTime:milli; not null" json:"created"`

	Sessions             []UserSession          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Documents            []Document             `gorm:"foreignKey:OwnerID; constraint:OnDelete:CASCADE"`
	DocumentSessions     []DocumentSession      `gorm:"foreignKey:UserID; constraint:OnDelete:CASCADE"`
	DocumentCollaborator []DocumentCollaborator `gorm:"foreignKey:UserID; constraint:OnDelete:CASCADE"`
	DocumentEvents       []DocumentEvent        `gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE"`
	Operations           []Operation            `gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE"`
}

type UserSession struct {
	gorm.Model
	ID           uint   `gorm:"primaryKey; not null; autoIncrement; unique" json:"id"`
	UserID       uint   `gorm:"not null; index" json:"user_id"`
	UserAgent    string `gorm:"type:text" json:"user_agent"`
	Token        string `gorm:"type:text; not null; unique" json:"token"`
	RefreshToken string `gorm:"type:text; not null; unique" json:"refresh_token"`
	CreatedAt    int64  `gorm:"autoCreateTime:milli; not null" json:"created_at"`
	ExpiresAt    int64  `gorm:"type:int8; not null" json:"expires_at"`
	IsRevoked    bool   `gorm:"type:bool; not null" json:"is_revoked"`
	IpAddress    string `gorm:"type:text; not null" json:"ip_address"`
}

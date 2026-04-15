package utils

import (
	"crypto/rand"
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"encoding/hex"
	"errors"
	"time"

	"gorm.io/gorm"
)

func GenerateDocumentLink() string {
	b := make([]byte, 10)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func CanEdit(access string) bool {
	return access == "owner" || access == "read-write"
}

func GenerateSessionToken() string {
	b := make([]byte, 12)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func CredentialsExists(username, email string) (bool, error) {
	result := db.Db.Where("Username = ? OR Email = ?", username, email).First(&models.User{})

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, result.Error
	}

	return true, nil
}

func HasDocumentAccess(userID uint, docID uint) bool {

	var doc models.Document
	if err := db.Db.Where("id = ?", docID).First(&doc).Error; err != nil {
		return false
	}

	if doc.OwnerID == userID {
		return true
	}

	var collab models.DocumentCollaborator
	if err := db.Db.
		Where("document_id = ? AND user_id = ?", docID, userID).
		First(&collab).Error; err == nil {
		return true
	}

	return false
}

func HasActiveDocumentSession(userID uint, docID uint) bool {

	var docSession models.DocumentSession
	if err := db.Db.Where("document_id = ? AND user_id = ?", docID, userID).
		Last(&docSession).Error; err != nil {
		return false
	}

	if docSession.IsRevoked || docSession.ExpiresAt < time.Now().Unix() {
		return false
	}

	return true
}

func RevokeDocumentSession(userID uint, docID uint) error {
	return db.Db.Model(&models.DocumentSession{}).
		Where("document_id = ? AND user_id = ? AND is_revoked = false", docID, userID).
		Update("is_revoked", true).Error
}

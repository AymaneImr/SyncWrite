package utils

import (
	"crypto/rand"
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"encoding/hex"
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

func HasDocumentAccess(userID uint, docID uint) bool {

	var doc models.Document
	if err := db.Db.
		Where("id = ? AND owner_id = ?", docID, userID).
		First(&doc).Error; err == nil {
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

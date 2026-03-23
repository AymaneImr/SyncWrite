package handlers

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"

	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func StartDocumentSession(doc_id uint, user_id uint) (*models.DocumentSession, error) {

	// Check if document session exists
	var docSession models.DocumentSession
	if err := db.Db.Where("document_id = ? AND user_id = ?", doc_id, user_id).Last(&docSession).Error; err == nil {
		if time.Now().Unix() < docSession.ExpiresAt && !docSession.IsRevoked {

			// session already exist and not expired => return it
			return &docSession, nil
		}
	}

	token := utils.GenerateSessionToken()

	// Session doesn't exist => create one
	newSession := models.DocumentSession{
		DocumentID:    doc_id,
		Token:         token,
		UserID:        user_id,
		NumberOfUsers: 1,
		CreatedAt:     time.Now().Unix(),
		ExpiresAt:     time.Now().Add(30 * time.Minute).Unix(),
		IsRevoked:     false,
	}

	if err := db.Db.Create(&newSession).Error; err != nil {
		return nil, errors.New("Failed to create document session")
	}

	return &newSession, nil
}

func DeleteDocumentSession(r *gin.Context) {
	doc_idStr := r.Param("id")
	user_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	var docSession models.DocumentSession
	if err := db.Db.Where("document_id = ? AND user_id = ?", doc_id, user_id).Last(&docSession).Error; err != nil {
		r.JSON(http.StatusForbidden, gin.H{"error": "Session expired"})
		return
	}

	if err := db.Db.Delete(&docSession).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete session"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Session deleted"})
}

func EndDocumentSession(r *gin.Context) {
	doc_idStr := r.Param("id")
	access := r.GetString("access_level")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	// FIX: fix DocumentSession table to have 1 session at a time
	// currently each collaborator enters the editor it creates a new document session

	// if owner revokes all session not just his own
	if access == "owner" {
		if err := db.Db.Model(&models.DocumentSession{}).
			Where("document_id = ? AND is_revoked = false", doc_id).
			Update("is_revoked", true).Error; err != nil {
			r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to end document session"})
			return
		}

		r.JSON(http.StatusOK, gin.H{"message": "Session ended"})
		return
	}

	r.JSON(http.StatusUnauthorized, gin.H{"error": "Only owner can end sessions"})
}

type ActiveUserDTO struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Online   bool   `json:"online"`
}

func GetActiveUsers(r *gin.Context) {
	doc_idStr := r.Param("id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)
	now := time.Now().Unix()

	var sessions []models.DocumentSession
	if err := db.Db.Where("document_id = ? AND is_revoked = ? AND expires_at > ?", doc_id, false, now).
		Find(&sessions).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't load sessions"})
		return
	}

	user_ids := make([]uint, 0, len(sessions))
	seen := make(map[uint]struct{}, len(sessions))

	for _, session := range sessions {
		if _, exists := seen[session.UserID]; exists {
			continue
		}

		seen[session.UserID] = struct{}{}
		user_ids = append(user_ids, session.UserID)
	}

	if len(user_ids) == 0 {
		r.JSON(http.StatusOK, gin.H{"online_users": []ActiveUserDTO{}})
		return
	}

	var users []ActiveUserDTO
	if err := db.Db.Table("users").
		Select("id, username, true as online").
		Where("id IN ?", user_ids).
		Find(&users).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't load active users"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"online_users": users})
}

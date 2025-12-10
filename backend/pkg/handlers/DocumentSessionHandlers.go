package handlers

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func StartDocumentSession(r *gin.Context) {
	doc_idStr := r.Param("id")
	user_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	var docSession models.DocumentSession
	if err := db.Db.Where("document_id = ? AND user_id = ?", doc_id, user_id).First(&docSession).Error; err == nil {
		// session already exist
		r.JSON(http.StatusOK, gin.H{
			"message": "Session already exists",
			"token":   docSession.Token,
		})
		return
	}

	token := utils.GenerateSessionToken()

	newSession := models.DocumentSession{
		DocumentID:    doc_id,
		Token:         token,
		UserID:        user_id,
		NumberOfUsers: 1,
		CreatedAt:     time.Now().Unix(),
		ExpiresAt:     time.Now().Add(30 * time.Minute).Unix(),
	}

	if err := db.Db.Create(&newSession).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create document session"})
		return
	}

	r.JSON(http.StatusOK, gin.H{
		"message": "Session started",
		"token":   token,
	})
}

func EndDocumentSession(r *gin.Context) {
	doc_idStr := r.Param("id")
	user_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	var docSession models.DocumentSession
	if err := db.Db.Where("document_id = ? AND user_id = ?", doc_id, user_id).First(&docSession).Error; err != nil {
		r.JSON(http.StatusForbidden, gin.H{"error": "Session expired"})
		return
	}

	if err := db.Db.Delete(&docSession).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete session"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Session ended"})
}

func GetActiveUsers(r *gin.Context) {
	doc_idStr := r.Param("id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	var sessions []models.DocumentSession
	if err := db.Db.Where("document_id = ?", doc_id).Find(&sessions).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't load sessions"})
		return
	}

	var users []models.User
	var users_ids []uint

	for _, session := range sessions {
		users_ids = append(users_ids, session.UserID)
	}

	if err := db.Db.Where("id IN ?", users_ids).Find(&users).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't load active users"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"online_users": users})
}

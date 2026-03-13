package utils

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"

	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func DocumentAccess() gin.HandlerFunc {
	return func(r *gin.Context) {

		docIDStr := r.Param("id")
		docID64, _ := strconv.ParseUint(docIDStr, 10, 64)

		docID := uint(docID64)
		userID := r.GetUint("user_id")

		// Check if the document exists
		var doc models.Document
		if err := db.Db.Where("id = ?", docID).First(&doc).Error; err != nil {
			r.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}

		// Check if document session exists
		var doc_session models.DocumentSession
		if err := db.Db.Where("document_id = ? AND user_id = ?", doc.ID, userID).Last(&doc_session).Error; err != nil {
			r.JSON(http.StatusNotFound, gin.H{"error": "Document session not found"})
			return
		}

		// Check if document session is valid
		if doc_session.ExpiresAt <= time.Now().Unix() || doc_session.IsRevoked {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "Session expiredd"})
			return
		}

		// Check if user is the OWNER of the document
		if doc.OwnerID == userID {

			// User IS the owner
			r.Set("access_level", "owner")
			r.Set("document", doc)
			r.Next()
			return
		}

		// Not owner → check collaborator table
		var collaborator models.DocumentCollaborator
		if err := db.Db.Where("document_id = ? AND user_id = ?", docID, userID).First(&collaborator).Error; err != nil {

			// User is neither owner nor collaborator → reject
			r.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this document"})
			return
		}

		// 5. User is collaborator → set permission
		r.Set("access_level", collaborator.Permission)
		r.Set("document", doc)
		r.Next()
	}
}

// temp middlewar
func DocumentAccessLink() gin.HandlerFunc {
	return func(r *gin.Context) {

		link := r.Param("link")
		userID := r.GetUint("user_id")

		// Check if the document exists
		var doc models.Document
		if err := db.Db.Where("link = ?", link).First(&doc).Error; err != nil {
			r.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}

		// Check if document session exists
		var doc_session models.DocumentSession
		if err := db.Db.Where("document_id = ? AND user_id = ?", doc.ID, userID).Last(&doc_session).Error; err != nil {
			r.JSON(http.StatusNotFound, gin.H{"error": "Document session not found"})
			return
		}

		// Check if document session is active
		if doc_session.ExpiresAt <= time.Now().Unix() || doc_session.IsRevoked {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "Session expired"})
			return
		}

		// Check if user is the OWNER of the document
		if doc.OwnerID == userID {
			// User IS the owner
			r.Set("access_level", "owner")
			r.Set("document", doc)
			r.Next()
			return
		}

		// Not owner → check collaborator table
		var collaborator models.DocumentCollaborator
		if err := db.Db.Where("document_id = ? AND user_id = ?", doc.ID, userID).First(&collaborator).Error; err != nil {

			// User is neither owner nor collaborator → reject
			r.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this document"})
			return
		}

		// 5. User is collaborator → set permission
		r.Set("access_level", collaborator.Permission)
		r.Set("document", doc)
		r.Next()
	}
}

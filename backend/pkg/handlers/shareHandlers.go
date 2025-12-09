package handlers

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"

	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func InviteUser(r *gin.Context) {
	doc_idStr := r.Param("id")
	owner_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	var body struct {
		Email      string `json:"email"`
		Permission string `json:"permission"`
	}

	if err := r.BindJSON(&body); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	var doc models.Document
	if err := db.Db.Where("id = ? AND owner_id = ?", doc_id, owner_id).First(&doc).Error; err != nil {
		r.JSON(http.StatusForbidden, gin.H{"error": "Not allowed or document not found"})
		return
	}

	var invitedUser models.User
	if err := db.Db.Where("email = ?", body.Email).First(&invitedUser).Error; err != nil {
		r.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var invitedUserIsCollaborator models.DocumentCollaborator
	if err := db.Db.Where("document_id = ? AND user_id = ?", doc_id, invitedUser.ID).First(&invitedUserIsCollaborator).Error; err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "User already a collaborator"})
		return
	}

	collaborator := models.DocumentCollaborator{
		DocumentID: doc_id,
		UserID:     invitedUser.ID,
		Permission: body.Permission,
		InvitedBy:  owner_id,
		InvitedAt:  time.Now().Unix(),
	}

	if err := db.Db.Create(&collaborator).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add collaborator"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Collaborator invited"})
}

func GetCollaborators(r *gin.Context) {
	doc_idStr := r.Param("id")
	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)

	doc_id := uint(docID64)
	user_id := r.GetUint("user_id")

	var doc models.Document
	if err := db.Db.Where("id = ? AND owner_id = ?", doc_id, user_id).First(&doc).Error; err != nil {
		r.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var collaborators []models.DocumentCollaborator
	db.Db.Where("document_id = ?", doc_id).Find(&collaborators)

	r.JSON(http.StatusOK, gin.H{"collaborators": collaborators})
}

func UpdateCollaboratorPermission(r *gin.Context) {
	doc_idStr := r.Param("id")
	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)

	user_idStr := r.Param("userId")
	userID64, _ := strconv.ParseUint(user_idStr, 10, 64)

	doc_id := uint(docID64)
	owner_id := r.GetUint("user_id")
	user_id := uint(userID64)

	var body struct {
		Permission string `json:"permission"`
	}

	if err := r.BindJSON(&body); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	var doc models.Document
	if err := db.Db.Where("id = ? AND owner_id = ?", doc_id, owner_id).First(&doc).Error; err != nil {
		r.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}

	if err := db.Db.Model(&models.DocumentCollaborator{}).
		Where("document_id = ? AND user_id = ?", doc_id, user_id).
		Update("permission", body.Permission).
		Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update permission"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Permission updated"})

}

func DeleteColabborator(r *gin.Context) {

	doc_idStr := r.Param("id")
	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)

	user_idStr := r.Param("userId")
	userID64, _ := strconv.ParseUint(user_idStr, 10, 64)

	doc_id := uint(docID64)
	owner_id := r.GetUint("user_id")
	user_id := uint(userID64)

	var doc models.Document
	if err := db.Db.Where("id = ? AND owner_id = ?", doc_id, owner_id).First(&doc).Error; err != nil {
		r.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}

	if err := db.Db.Where("document_id = ? AND user_id = ?", doc_id, user_id).Delete(&models.DocumentCollaborator{}).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove collaborator"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Collaborator removed"})
}

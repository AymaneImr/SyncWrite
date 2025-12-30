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

func CreateDocument(r *gin.Context) {
	user_id := r.GetUint("user_id")

	var body struct {
		Title string `json:"title"`
	}

	if err := r.BindJSON(&body); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if body.Title == " " {
		body.Title = "Untitled"
	}

	link := utils.GenerateDocumentLink()

	document := models.Document{
		OwnerID:   user_id,
		Title:     body.Title,
		Content:   "",
		Link:      link,
		CreatedAt: time.Now().Unix(),
	}

	if err := db.Db.Create(&document).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create document"})
		return
	}

	r.JSON(http.StatusOK, gin.H{
		"message":  "Document created",
		"document": document,
	})
}

func LoadDocuments(r *gin.Context) {
	user_id := r.GetUint("user_id")

	var docs []models.Document
	err := db.Db.Where("owner_id = ?", user_id).Order("updated_at DESC").Find(&docs).Error

	if err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch documents"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"documents": docs})
}

func LoadDocument(r *gin.Context) {
	doc_idStr := r.Param("id")
	user_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	var doc models.Document
	err := db.Db.Where("id = ? AND owner_id = ?", doc_id, user_id).First(&doc).Error

	if err != nil {
		r.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"document": doc})
}

func UpdateTitle(r *gin.Context) {
	doc_idStr := r.Param("id")
	user_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	access := r.GetString("access_level")
	if access != "owner" {
		r.JSON(http.StatusForbidden, gin.H{"error": "Only owner can rename document"})
		return
	}

	var body struct {
		Title string `json:"title"`
	}

	if err := r.BindJSON(&body); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	var doc models.Document
	err := db.Db.Where("id = ? AND owner_id = ?", doc_id, user_id).First(&doc).Error

	if err != nil {
		r.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	doc.Title = body.Title
	doc.LastEditedBy = strconv.FormatUint(uint64(user_id), 10)
	doc.UpdatedAt = time.Now().Unix()

	db.Db.Save(&doc)

	r.JSON(http.StatusOK, gin.H{"message": "Document title updated", "document": doc})
}

func UpdateContent(r *gin.Context) {
	doc_idStr := r.Param("id")
	user_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	access := r.GetString("access_level")
	if !utils.CanEdit(access) {
		r.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to edit this document"})
		return
	}

	var body struct {
		Content string `json:"content"`
	}

	if err := r.BindJSON(&body); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	if body.Content == "" {
		r.JSON(http.StatusOK, gin.H{"message": "document content is cleared"})
		return
	}

	var doc models.Document
	err := db.Db.Where("id = ? AND owner_id = ?", doc_id, user_id).First(&doc).Error

	if err != nil {
		r.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	doc.Content = body.Content
	doc.LastEditedBy = strconv.FormatUint(uint64(user_id), 10)
	doc.UpdatedAt = time.Now().Unix()

	db.Db.Save(&doc)

	r.JSON(http.StatusOK, gin.H{"message": "Document updated", "document": doc})
}

func DeleteDocument(r *gin.Context) {

	doc_idStr := r.Param("id")
	user_id := r.GetUint("user_id")

	docID64, _ := strconv.ParseUint(doc_idStr, 10, 64)
	doc_id := uint(docID64)

	access := r.GetString("access_level")
	if access != "owner" {
		r.JSON(http.StatusForbidden, gin.H{"error": "Only document owner can delete it"})
		return
	}

	err := db.Db.Where("id = ? AND owner_id = ?", doc_id, user_id).Delete(&models.Document{}).Error

	if err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete document"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Document deleted"})
}

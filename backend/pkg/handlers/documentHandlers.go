package handlers

import (
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func CreateDocument(r *gin.Context) {
	user_id := r.GetUint("user_id")

	var body struct {
		Title string `json:"title"`
	}

	if err := r.BindJSON(body); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
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
	err := db.Db.Where("owner_id = ?", user_id).Order("updated_at DESC").Find(docs).Error

	if err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch documents"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"documents": docs})
}

func LoadDocument(r *gin.Context) {
	doc_id := r.Param("id")
	user_id := r.GetUint("user_id")

	var doc models.Document
	err := db.Db.Where("id = ? AND owner_id = ?", doc_id, user_id).First(&doc).Error

	if err != nil {
		r.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"document": doc})
}

func UpdateDocument(r *gin.Context) {
	doc_id := r.Param("id")
	user_id := r.GetUint("user_id")

	var body struct {
		Title   string `json:"title"`
		Content string `json:"content"`
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
	doc.Content = body.Content
	doc.LastEditedBy = string(user_id)
	doc.UpdatedAt = time.Now().Unix()

	db.Db.Save(&doc)

	r.JSON(http.StatusOK, gin.H{"message": "Document updated", "document": doc})
}

func DeleteDocument(r *gin.Context) {

	doc_id := r.Param("id")
	user_id := r.GetUint("user_id")

	err := db.Db.Where("id = ? AND owner_id = ?", doc_id, user_id).Delete(&models.Document{}).Error

	if err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete document"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Document deleted"})
}

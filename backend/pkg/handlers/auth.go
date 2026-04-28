package handlers

import (
	"document_editor/pkg/config"
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"
	"fmt"

	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func RegisterUser(r *gin.Context) {

	var req struct {
		Username        string `json:"username"`
		Email           string `json:"email"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirmPassword"`
	}

	err := r.BindJSON(&req)

	if err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Username == "" || req.Email == "" || req.Password == "" || req.ConfirmPassword == "" {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Missing fields"})
		return
	}

	if req.Password != req.ConfirmPassword {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Passwords dont match"})
		return
	}

	exists, err := utils.CredentialsExists(req.Username, req.Email)
	if exists {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Username Or Email already exists"})
		return
	}

	if err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "An error occured while filtering DATABASE"})
		return
	}

	hashed_password, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	if err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Couldn't hash password"})
		return
	}

	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashed_password),
		IsActive: false,
	}

	if err := db.Db.Create(&user).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	r.JSON(http.StatusCreated, gin.H{"info": "User registered successfully"})
}

func Login(r *gin.Context) {

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := r.BindJSON(&req)

	if err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Email == "" || req.Password == "" {
		r.JSON(http.StatusNotFound, gin.H{"error": "Missing fields"})
		return
	}

	var db_user models.User
	result := db.Db.Where("Email = ? ", req.Email).First(&db_user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			r.JSON(http.StatusNotFound, gin.H{"error": "User with this this email doesn't exist"})
			return
		}

		println("Database error details:", result.Error.Error())
		r.JSON(http.StatusNotFound, gin.H{"error": "Database error"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(db_user.Password), []byte(req.Password))
	if err != nil {
		r.JSON(http.StatusUnauthorized, gin.H{"error": "Wrong password"})
		return
	}

	access, _ := utils.GenerateAccessToken(db_user.ID, config.Env.JWT_SECRET)
	refresh, _ := utils.GenerateRefreshToken(db_user.ID, config.Env.REFRESH_SECRET)

	// create user session
	session := models.UserSession{
		UserID:       db_user.ID,
		Token:        access,
		RefreshToken: refresh,
		IpAddress:    r.ClientIP(),
		UserAgent:    r.Request.UserAgent(),
		CreatedAt:    time.Now().Unix(),
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour).Unix(),
		IsRevoked:    false,
	}

	if err := db.Db.Create(&session).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create user session "})
		return
	}

	r.JSON(200, gin.H{
		"message":       "Login successful",
		"access_token":  access,
		"refresh_token": refresh,
		"user": gin.H{
			"id":       db_user.ID,
			"username": db_user.Username,
			"email":    db_user.Email,
		},
	})
}

func RequestPasswordReset(r *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}

	if err := r.BindJSON(&req); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Email == "" {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Missing fields"})
		return
	}

	var db_user models.User
	if err := db.Db.Where("email = ?", req.Email).First(&db_user).Error; err != nil {
		r.JSON(http.StatusNotFound, gin.H{"error": "User with this Email doesn't exist"})
		return
	}

	token, err := utils.GenerateResetToken()
	if err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate reset token"})
		return
	}

	resetToken := models.PasswordResetToken{
		UserID:    db_user.ID,
		Token:     utils.HashResetToken(token),
		ExpiresAt: time.Now().Add(30 * time.Minute).Unix(),
		IsUsed:    false,
	}

	if err := db.Db.Create(&resetToken).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not store reset token"})
		return
	}

	link := fmt.Sprintf("http://localhost:5173/reset-password?token=%s", token)
	body := fmt.Sprintf("click on this link to change password, %s", link)

	if err := utils.SendEmail(req.Email, "reset password", body); err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email confirmation link"})
		return
	}

	response := gin.H{"info": "A password reset link has been sent, check your mail box"}
	r.JSON(http.StatusOK, response)
}

func VerifyPasswordResetToken(r *gin.Context) {
	token := r.Query("token")
	if token == "" {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Missing token"})
		return
	}

	var resetToken models.PasswordResetToken
	err := db.Db.
		Where("token = ? AND is_used = false AND expires_at > ?", utils.HashResetToken(token), time.Now().Unix()).
		First(&resetToken).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired reset token"})
			return
		}
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify reset token"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"info": "Reset token is valid"})
}

func ConfirmPasswordReset(r *gin.Context) {
	var req struct {
		Token           string `json:"token"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}

	if err := r.BindJSON(&req); err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Missing fields"})
		return
	}

	if req.ConfirmPassword != "" && req.NewPassword != req.ConfirmPassword {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Passwords dont match"})
		return
	}

	hashed_password, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		r.JSON(http.StatusBadRequest, gin.H{"error": "Couldn't hash password"})
		return
	}

	now := time.Now().Unix()
	var resetToken models.PasswordResetToken

	err = db.Db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where("token = ? AND is_used = false AND expires_at > ?", utils.HashResetToken(req.Token), now).
			First(&resetToken).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.User{}).
			Where("id = ?", resetToken.UserID).
			Update("password", string(hashed_password)).Error; err != nil {
			return err
		}

		return tx.Model(&models.PasswordResetToken{}).
			Where("id = ?", resetToken.ID).
			Update("is_used", true).Error
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			r.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired reset token"})
			return
		}
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not reset password"})
		return
	}

	r.JSON(http.StatusAccepted, gin.H{"info": "Password changed successfully"})
}

func Logout(r *gin.Context) {
	sessionRaw, exists := r.Get("session")

	if !exists {
		r.JSON(http.StatusUnauthorized, gin.H{"error": "Session not found"})
		return
	}

	session := sessionRaw.(models.UserSession)
	session.IsRevoked = true

	if err := db.Db.Save(&session).Error; err != nil {
		r.JSON(http.StatusInternalServerError, gin.H{"error": "Could not revoke session"})
		return
	}

	r.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

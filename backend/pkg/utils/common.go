package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"document_editor/pkg/config"
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"

	gomail "gopkg.in/mail.v2"
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

func GenerateResetToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func HashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
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

func SendEmail(send_to string, subject string, body string) error {
	smtpPort, err := strconv.Atoi(config.Env.SMTP_PORT)
	if err != nil {
		return fmt.Errorf("invalid SMTP_PORT: %w", err)
	}

	msg := gomail.NewMessage()

	msg.SetHeader("From", config.Env.SMTP_EMAIL)
	msg.SetHeader("To", send_to)
	msg.SetHeader("Subject", subject)

	msg.SetBody("text/plain", body)

	dialer := gomail.NewDialer(
		config.Env.SMTP_HOST,
		smtpPort,
		config.Env.SMTP_EMAIL,
		config.Env.SMTP_PASSWORD,
	)

	if err := dialer.DialAndSend(msg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

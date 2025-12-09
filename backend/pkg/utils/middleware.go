package utils

import (
	"document_editor/pkg/config"
	"document_editor/pkg/db"
	"document_editor/pkg/models"

	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization header"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		fmt.Println(len(parts))
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization format"})
			c.Abort()
			return
		}

		tokenStr := parts[1]
		fmt.Println(tokenStr)
		fmt.Println(config.Env.JWT_SECRET)

		claims, err := ParseToken(tokenStr, config.Env.JWT_SECRET)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		var userSession models.UserSession
		err = db.Db.Where("token = ? AND is_revoked = false", tokenStr).First(&userSession).Error
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Session expired or revoked"})
			c.Abort()
			return
		}

		var user models.User
		if err = db.Db.First(user, claims.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		c.Set("user_id", user.ID)
		c.Set("user", user)
		c.Set("session", userSession)

		c.Next()
	}
}

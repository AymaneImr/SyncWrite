package handlers

import (
	"context"
	"document_editor/pkg/config"
	"document_editor/pkg/db"
	"document_editor/pkg/models"
	"document_editor/pkg/utils"

	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

type googleUserInfo struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func OauthLogin(r *gin.Context) {
	oauthConfig := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  googleRedirectURL(),
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}

	r.Redirect(http.StatusTemporaryRedirect, oauthConfig.AuthCodeURL("google-oauth"))
}

func OauthCallback(r *gin.Context) {
	code := r.Query("code")
	if code == "" {
		redirectOAuthError(r, "Missing code")
		return
	}

	oauthConfig := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  googleRedirectURL(),
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}

	token, err := oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		redirectOAuthError(r, "Failed to exchange code")
		return
	}

	client := oauthConfig.Client(r.Request.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		redirectOAuthError(r, "Failed to fetch google user")
		return
	}

	defer resp.Body.Close()

	var googleUser googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		redirectOAuthError(r, "Invalid google response")
		return
	}

	if googleUser.Email == "" {
		redirectOAuthError(r, "Google account has no email")
		return
	}

	user, err := getOrCreateGoogleUser(googleUser)
	if err != nil {
		redirectOAuthError(r, "Failed to create google user")
		return
	}

	access, _ := utils.GenerateAccessToken(user.ID, config.Env.JWT_SECRET)
	refresh, _ := utils.GenerateRefreshToken(user.ID, config.Env.REFRESH_SECRET)

	session := models.UserSession{
		UserID:       user.ID,
		Token:        access,
		RefreshToken: refresh,
		IpAddress:    r.ClientIP(),
		UserAgent:    r.Request.UserAgent(),
		CreatedAt:    time.Now().Unix(),
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour).Unix(),
		IsRevoked:    false,
	}

	if err := db.Db.Create(&session).Error; err != nil {
		redirectOAuthError(r, "Could not create user session")
		return
	}

	redirectURL := os.Getenv("FRONTEND_OAUTH_REDIRECT")
	if redirectURL == "" {
		redirectURL = "http://localhost:5173/oauth/google/callback"
	}

	values := url.Values{}
	values.Set("access_token", access)
	values.Set("refresh_token", refresh)
	r.Redirect(http.StatusTemporaryRedirect, redirectURL+"?"+values.Encode())
}

func getOrCreateGoogleUser(googleUser googleUserInfo) (*models.User, error) {
	var user models.User
	err := db.Db.Where("email = ?", googleUser.Email).First(&user).Error
	if err == nil {
		return &user, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	username := strings.Split(googleUser.Email, "@")[0]
	if googleUser.Name != "" {
		username = strings.ToLower(strings.ReplaceAll(googleUser.Name, " ", ""))
	}

	if len(username) > 15 {
		username = username[:15]
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(googleUser.Email), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user = models.User{
		Username: username,
		Email:    googleUser.Email,
		Password: string(hashedPassword),
		IsActive: true,
	}

	if err := db.Db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func googleRedirectURL() string {
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if redirectURL == "" {
		return "http://localhost:8080/api/auth/google/callback"
	}

	return redirectURL
}

func redirectOAuthError(r *gin.Context, message string) {
	redirectURL := os.Getenv("FRONTEND_OAUTH_ERROR_REDIRECT")
	if redirectURL == "" {
		redirectURL = "http://localhost:5173/login"
	}

	values := url.Values{}
	values.Set("error", message)
	r.Redirect(http.StatusTemporaryRedirect, redirectURL+"?"+values.Encode())
}

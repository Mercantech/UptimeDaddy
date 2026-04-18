package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/auth"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/db"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	var account models.Accounts
	if err := db.DB.Where("email = ?", req.Email).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, "invalid email or password", http.StatusUnauthorized)
			return
		}

		http.Error(w, "could not process login", http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(account.Password), []byte(req.Password)); err != nil {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	accessToken, accessExpiry, err := auth.GenerateAccessToken(account)
	if err != nil {
		http.Error(w, "could not create access token", http.StatusInternalServerError)
		return
	}

	refreshToken, refreshExpiry, err := auth.GenerateRefreshToken(account)
	if err != nil {
		http.Error(w, "could not create refresh token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models.LoginResponse{
		Message:          "login successful",
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		AccessExpiresAt:  accessExpiry,
		RefreshExpiresAt: refreshExpiry,
	}); err != nil {
		http.Error(w, "could not encode response", http.StatusInternalServerError)
		return
	}
}

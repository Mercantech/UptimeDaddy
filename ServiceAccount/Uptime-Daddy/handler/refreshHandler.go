package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/auth"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/db"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/models"
	"gorm.io/gorm"
)

func RefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.RefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.RefreshToken == "" {
		http.Error(w, "refreshToken is required", http.StatusBadRequest)
		return
	}

	claims, err := auth.ParseRefreshToken(req.RefreshToken)
	if err != nil {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}

	var account models.Accounts
	if err := db.DB.First(&account, claims.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, "account not found", http.StatusUnauthorized)
			return
		}

		http.Error(w, "could not process refresh", http.StatusInternalServerError)
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
		Message:          "token refreshed",
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		AccessExpiresAt:  accessExpiry,
		RefreshExpiresAt: refreshExpiry,
	}); err != nil {
		http.Error(w, "could not encode response", http.StatusInternalServerError)
		return
	}
}

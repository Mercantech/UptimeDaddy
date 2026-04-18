package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/db"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/models"
	"golang.org/x/crypto/bcrypt"
)

func CreateAccountHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" {
		http.Error(w, "email and password and name are required", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "could not hash password", http.StatusInternalServerError)
		return
	}

	account := models.Accounts{
		Email:    req.Email,
		Password: string(hashedPassword),
		FullName: req.FullName,
	}

	if err := db.DB.Create(&account).Error; err != nil {
		http.Error(w, "could not create account", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("account created"))
}

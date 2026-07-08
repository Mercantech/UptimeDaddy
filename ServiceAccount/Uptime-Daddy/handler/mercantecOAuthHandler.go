package handler

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/auth"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/db"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type mercantecTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
}

// MercantecOAuthHandler afslutter authorization code + PKCE-flowet:
// veksler koden hos Mercantec, validerer det udstedte JWT mod JWKS, finder
// eller opretter en lokal konto ud fra e-mailen og udsteder derefter vores
// egne HS256-tokens — så resten af platformen er uændret.
func MercantecOAuthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !auth.MercantecConfigured() {
		http.Error(w, "mercantec login is not configured", http.StatusServiceUnavailable)
		return
	}

	var req models.MercantecOAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Code == "" || req.CodeVerifier == "" || req.RedirectURI == "" {
		http.Error(w, "code, codeVerifier and redirectUri are required", http.StatusBadRequest)
		return
	}

	mercantecToken, err := exchangeMercantecCode(req)
	if err != nil {
		http.Error(w, "could not exchange authorization code", http.StatusBadGateway)
		return
	}

	claims, err := auth.ValidateMercantecToken(mercantecToken.AccessToken)
	if err != nil {
		http.Error(w, "invalid token from mercantec", http.StatusUnauthorized)
		return
	}

	email := strings.TrimSpace(strings.ToLower(claims.Email))
	if email == "" {
		http.Error(w, "mercantec account has no email", http.StatusUnprocessableEntity)
		return
	}

	account, err := findOrCreateMercantecAccount(email, claims.Name)
	if err != nil {
		http.Error(w, "could not provision account", http.StatusInternalServerError)
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

func exchangeMercantecCode(req models.MercantecOAuthRequest) (*mercantecTokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", req.Code)
	form.Set("redirect_uri", req.RedirectURI)
	form.Set("client_id", auth.MercantecClientID())
	form.Set("code_verifier", req.CodeVerifier)
	if secret := auth.MercantecClientSecret(); secret != "" {
		form.Set("client_secret", secret)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.PostForm(auth.MercantecTokenEndpoint(), form)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("mercantec token endpoint returned status " + resp.Status)
	}

	var tokenResp mercantecTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}
	if tokenResp.AccessToken == "" {
		return nil, errors.New("mercantec token response missing access_token")
	}

	return &tokenResp, nil
}

func findOrCreateMercantecAccount(email, name string) (models.Accounts, error) {
	var account models.Accounts
	err := db.DB.Where("email = ?", email).First(&account).Error
	if err == nil {
		return account, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Accounts{}, err
	}

	fullName := strings.TrimSpace(name)
	if fullName == "" {
		fullName = email
	}

	// password_hash er NOT NULL. Eksterne konti kan ikke logge ind med
	// adgangskode, så vi sætter en uforudsigelig placeholder-hash.
	placeholder, err := randomPasswordHash()
	if err != nil {
		return models.Accounts{}, err
	}

	account = models.Accounts{
		Email:    email,
		Password: placeholder,
		FullName: fullName,
	}
	if err := db.DB.Create(&account).Error; err != nil {
		return models.Accounts{}, err
	}

	return account, nil
}

func randomPasswordHash() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	random := base64.RawStdEncoding.EncodeToString(buf)
	hash, err := bcrypt.GenerateFromPassword([]byte(random), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

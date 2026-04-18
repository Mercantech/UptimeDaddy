package auth

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/models"
	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type Claims struct {
	UserID    uint   `json:"userId"`
	Email     string `json:"email"`
	FullName  string `json:"fullName"`
	TokenType string `json:"tokenType"`
	jwt.RegisteredClaims
}

func getJWTSecret() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, errors.New("JWT_SECRET is not configured")
	}
	return []byte(secret), nil
}

func parseDurationEnv(key string, fallback time.Duration) time.Duration {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}

	return time.Duration(value) * time.Minute
}

func GenerateAccessToken(account models.Accounts) (string, int64, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return "", 0, err
	}

	expiresAt := time.Now().Add(parseDurationEnv("JWT_ACCESS_EXPIRES_MINUTES", 15*time.Minute))
	claims := Claims{
		UserID:    account.ID,
		Email:     account.Email,
		FullName:  account.FullName,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprint(account.ID),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    os.Getenv("JWT_ISSUER"),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret)
	if err != nil {
		return "", 0, err
	}

	return signed, expiresAt.Unix(), nil
}

func GenerateRefreshToken(account models.Accounts) (string, int64, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return "", 0, err
	}

	expiresAt := time.Now().Add(parseDurationEnv("JWT_REFRESH_EXPIRES_MINUTES", 7*24*time.Hour))
	claims := Claims{
		UserID:    account.ID,
		Email:     account.Email,
		FullName:  account.FullName,
		TokenType: TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprint(account.ID),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    os.Getenv("JWT_ISSUER"),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret)
	if err != nil {
		return "", 0, err
	}

	return signed, expiresAt.Unix(), nil
}

func ParseToken(tokenString string) (*Claims, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return nil, err
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func ParseAccessToken(tokenString string) (*Claims, error) {
	claims, err := ParseToken(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != TokenTypeAccess {
		return nil, errors.New("token is not an access token")
	}
	return claims, nil
}

func ParseRefreshToken(tokenString string) (*Claims, error) {
	claims, err := ParseToken(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != TokenTypeRefresh {
		return nil, errors.New("token is not a refresh token")
	}
	return claims, nil
}

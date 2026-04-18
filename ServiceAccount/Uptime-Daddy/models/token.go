package models

import "github.com/golang-jwt/jwt/v5"

type Claims struct {
	UserID    uint   `json:"userId"`
	Email     string `json:"email"`
	FullName  string `json:"fullName"`
	TokenType string `json:"tokenType"`
	jwt.RegisteredClaims
}

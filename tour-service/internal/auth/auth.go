package auth

import (
	"errors"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid or expired token")

const RoleGuide = "guide"

type Claims struct {
	UserID   int64  `json:"userId"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change-me"
	}
	return []byte(secret)
}

func ParseToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

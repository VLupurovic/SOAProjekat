package auth

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   int64  `json:"userId"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

type contextKey string

const claimsKey contextKey = "claims"

func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")

		if authHeader == "" {
			http.Error(w, "missing authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)

		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "invalid authorization header", http.StatusUnauthorized)
			return
		}

		secret := os.Getenv("JWT_SECRET")

		if secret == "" {
			secret = "dev-secret-change-me"
		}

		token, err := jwt.ParseWithClaims(
			parts[1],
			&Claims{},
			func(token *jwt.Token) (interface{}, error) {
				return []byte(secret), nil
			},
		)

		if err != nil || !token.Valid {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(*Claims)

		if !ok {
			http.Error(w, "invalid token claims", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), claimsKey, claims)

		next(w, r.WithContext(ctx))
	}
}

func ClaimsFromContext(r *http.Request) *Claims {
	claims, ok := r.Context().Value(claimsKey).(*Claims)

	if !ok {
		return nil
	}

	return claims
}

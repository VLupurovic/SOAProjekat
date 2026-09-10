package handlers

import (
	"context"
	"net/http"
	"strings"

	"tour-service/internal/auth"
)

type contextKey string

const claimsContextKey contextKey = "claims"

func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}

		tokenString := strings.TrimPrefix(header, "Bearer ")
		claims, err := auth.ParseToken(tokenString)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		ctx := context.WithValue(r.Context(), claimsContextKey, claims)
		next(w, r.WithContext(ctx))
	}
}

func RequireGuide(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := claimsFromContext(r)
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "missing or invalid token")
			return
		}
		if claims.Role != auth.RoleGuide {
			writeError(w, http.StatusForbidden, "only guides can perform this action")
			return
		}
		next(w, r)
	}
}

func claimsFromContext(r *http.Request) *auth.Claims {
	claims, ok := r.Context().Value(claimsContextKey).(*auth.Claims)
	if !ok {
		return nil
	}
	return claims
}

func CORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

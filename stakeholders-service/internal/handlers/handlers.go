package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"stakeholders-service/internal/auth"
	"stakeholders-service/internal/models"
)

type Handler struct {
	DB *sql.DB
}

func New(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Username == "" || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "username, email and password are required")
		return
	}
	if req.Role != models.RoleGuide && req.Role != models.RoleTourist {
		writeError(w, http.StatusBadRequest, "role must be 'guide' or 'tourist'")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to process password")
		return
	}

	var id int64
	err = h.DB.QueryRow(
		`INSERT INTO users (username, email, password_hash, role)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		req.Username, req.Email, hash, req.Role,
	).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			writeError(w, http.StatusConflict, "username or email already taken")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	token, err := auth.GenerateToken(id, req.Username, req.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id":    id,
		"token": token,
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var (
		id           int64
		passwordHash string
		role         models.Role
	)

	err := h.DB.QueryRow(
		`SELECT id, password_hash, role
		 FROM users
		 WHERE username = $1`,
		req.Username,
	).Scan(&id, &passwordHash, &role)

	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusUnauthorized, "invalid username or password")
			return
		}
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	if !auth.CheckPassword(passwordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	token, err := auth.GenerateToken(id, req.Username, role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":    id,
		"token": token,
	})
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	var u models.User
	err := h.DB.QueryRow(
		`SELECT id, username, email, role, first_name, last_name,
		        profile_picture, bio, motto, is_blocked, created_at
		 FROM users WHERE id = $1`,
		claims.UserID,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.FirstName, &u.LastName,
		&u.ProfilePicture, &u.Bio, &u.Motto, &u.IsBlocked, &u.CreatedAt)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		log.Println("GetProfile error:", err)
		writeError(w, http.StatusInternalServerError, "failed to load profile")
		return
	}

	writeJSON(w, http.StatusOK, u)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	_, err := h.DB.Exec(
		`UPDATE users
		 SET first_name = $1, last_name = $2, profile_picture = $3,
		     bio = $4, motto = $5
		 WHERE id = $6`,
		req.FirstName, req.LastName, req.ProfilePicture, req.Bio, req.Motto,
		claims.UserID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) FollowUser(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	targetID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if claims.UserID == targetID {
		writeError(w, http.StatusBadRequest, "you cannot follow yourself")
		return
	}

	var exists bool
	err = h.DB.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`,
		targetID,
	).Scan(&exists)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	if !exists {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	_, err = h.DB.Exec(
		`INSERT INTO follows (follower_id, followed_id)
		 VALUES ($1, $2)
		 ON CONFLICT (follower_id, followed_id) DO NOTHING`,
		claims.UserID,
		targetID,
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to follow user")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"status": "following",
	})
}

func (h *Handler) IsFollowing(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	targetID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var following bool

	err = h.DB.QueryRow(
		`SELECT EXISTS(
			SELECT 1
			FROM follows
			WHERE follower_id = $1
			  AND followed_id = $2
		)`,
		claims.UserID,
		targetID,
	).Scan(&following)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{
		"following": following,
	})
}

func (h *Handler) GetPosition(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	var p models.Position
	err := h.DB.QueryRow(
		`SELECT user_id, latitude, longitude, updated_at
		 FROM tourist_positions WHERE user_id = $1`,
		claims.UserID,
	).Scan(&p.UserID, &p.Latitude, &p.Longitude, &p.UpdatedAt)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNoContent, nil)
		return
	}
	if err != nil {
		log.Println("GetPosition error:", err)
		writeError(w, http.StatusInternalServerError, "failed to load position")
		return
	}

	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) SetPosition(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	if claims.Role != models.RoleTourist {
		writeError(w, http.StatusForbidden, "only tourists can set position")
		return
	}

	var req models.SetPositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
		writeError(w, http.StatusBadRequest, "invalid coordinates")
		return
	}

	_, err := h.DB.Exec(
		`INSERT INTO tourist_positions (user_id, latitude, longitude, updated_at)
		 VALUES ($1, $2, $3, NOW())
		 ON CONFLICT (user_id)
		 DO UPDATE SET latitude = $2, longitude = $3, updated_at = NOW()`,
		claims.UserID, req.Latitude, req.Longitude,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save position")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	rows, err := h.DB.Query(
		`SELECT u.id, u.username, u.first_name, u.last_name,
		        u.profile_picture, u.bio, u.motto, u.role
		 FROM follows f
		 JOIN users u ON u.id = f.followed_id
		 WHERE f.follower_id = $1
		 ORDER BY u.username`,
		claims.UserID,
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load following")
		return
	}

	defer rows.Close()

	type FollowingUser struct {
		ID             int64  `json:"id"`
		Username       string `json:"username"`
		FirstName      string `json:"firstName"`
		LastName       string `json:"lastName"`
		ProfilePicture string `json:"profilePicture"`
		Bio            string `json:"bio"`
		Motto          string `json:"motto"`
		Role           string `json:"role"`
	}

	users := []FollowingUser{}

	for rows.Next() {
		var u FollowingUser

		if err := rows.Scan(
			&u.ID,
			&u.Username,
			&u.FirstName,
			&u.LastName,
			&u.ProfilePicture,
			&u.Bio,
			&u.Motto,
			&u.Role,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read following")
			return
		}

		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read following")
		return
	}

	writeJSON(w, http.StatusOK, users)
}

func (h *Handler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	rows, err := h.DB.Query(
		`
		SELECT
			u.id,
			u.username,
			u.first_name,
			u.last_name,
			u.profile_picture,
			u.bio,
			u.motto,
			u.role,
			COUNT(*) AS mutual_connections
		FROM follows f1
		JOIN follows f2
			ON f1.followed_id = f2.follower_id
		JOIN users u
			ON u.id = f2.followed_id
		WHERE f1.follower_id = $1
		  AND f2.followed_id <> $1
		  AND NOT EXISTS (
			  SELECT 1
			  FROM follows existing
			  WHERE existing.follower_id = $1
			    AND existing.followed_id = f2.followed_id
		  )
		GROUP BY
			u.id,
			u.username,
			u.first_name,
			u.last_name,
			u.profile_picture,
			u.bio,
			u.motto,
			u.role
		ORDER BY mutual_connections DESC, u.username
		LIMIT 10
		`,
		claims.UserID,
	)

	if err != nil {
		log.Println("GetRecommendations error:", err)
		writeError(w, http.StatusInternalServerError, "failed to load recommendations")
		return
	}

	defer rows.Close()

	type RecommendedUser struct {
		ID                int64  `json:"id"`
		Username          string `json:"username"`
		FirstName         string `json:"firstName"`
		LastName          string `json:"lastName"`
		ProfilePicture    string `json:"profilePicture"`
		Bio               string `json:"bio"`
		Motto             string `json:"motto"`
		Role              string `json:"role"`
		MutualConnections int    `json:"mutualConnections"`
	}

	recommendations := []RecommendedUser{}

	for rows.Next() {
		var u RecommendedUser

		if err := rows.Scan(
			&u.ID,
			&u.Username,
			&u.FirstName,
			&u.LastName,
			&u.ProfilePicture,
			&u.Bio,
			&u.Motto,
			&u.Role,
			&u.MutualConnections,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read recommendations")
			return
		}

		recommendations = append(recommendations, u)
	}

	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read recommendations")
		return
	}

	writeJSON(w, http.StatusOK, recommendations)
}

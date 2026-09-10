package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"tour-service/internal/auth"
	"tour-service/internal/models"
)

type Handler struct {
	Collection          *mongo.Collection
	ExecutionCollection *mongo.Collection
}

func New(collection *mongo.Collection, executionCollection *mongo.Collection) *Handler {
	return &Handler{
		Collection:          collection,
		ExecutionCollection: executionCollection,
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

var validDifficulties = map[models.Difficulty]bool{
	models.DifficultyEasy:     true,
	models.DifficultyModerate: true,
	models.DifficultyHard:     true,
}

func (h *Handler) CreateTour(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	var req models.CreateTourRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Description == "" {
		writeError(w, http.StatusBadRequest, "name and description are required")
		return
	}
	if !validDifficulties[req.Difficulty] {
		writeError(w, http.StatusBadRequest, "difficulty must be one of: easy, moderate, hard")
		return
	}

	tour := models.Tour{
		AuthorID:        claims.UserID,
		AuthorName:      claims.Username,
		Name:            req.Name,
		Description:     req.Description,
		Difficulty:      req.Difficulty,
		Tags:            req.Tags,
		Status:          models.StatusDraft,
		Price:           0,
		DurationMinutes: req.DurationMinutes,
		Images:          req.Images,
		CreatedAt:       time.Now(),
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	result, err := h.Collection.InsertOne(ctx, tour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create tour")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": result.InsertedID,
	})
}

func (h *Handler) ListPublishedTours(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := h.Collection.Find(ctx, bson.M{"status": models.StatusPublished}, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tours")
		return
	}
	defer cursor.Close(ctx)

	tours := []models.Tour{}
	if err := cursor.All(ctx, &tours); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read tours")
		return
	}

	summaries := make([]map[string]interface{}, 0, len(tours))
	for _, tour := range tours {
		summaries = append(summaries, map[string]interface{}{
			"id":              tour.ID.Hex(),
			"authorName":      tour.AuthorName,
			"name":            tour.Name,
			"description":     tour.Description,
			"difficulty":      tour.Difficulty,
			"tags":            tour.Tags,
			"price":           tour.Price,
			"durationMinutes": tour.DurationMinutes,
			"images":          tour.Images,
			"startPoint":      tour.StartPoint,
			"createdAt":       tour.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, summaries)
}

func (h *Handler) ListMyTours(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := h.Collection.Find(ctx, bson.M{"authorId": claims.UserID}, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tours")
		return
	}
	defer cursor.Close(ctx)

	tours := []models.Tour{}
	if err := cursor.All(ctx, &tours); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read tours")
		return
	}

	writeJSON(w, http.StatusOK, tours)
}

func (h *Handler) GetTour(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	tour, status, errMsg := h.loadOwnedTour(r, claims.UserID)
	if errMsg != "" {
		writeError(w, status, errMsg)
		return
	}

	writeJSON(w, http.StatusOK, tour)
}

func (h *Handler) SetStartPoint(w http.ResponseWriter, r *http.Request) {
	h.setEndpoint(w, r, "startPoint")
}

func (h *Handler) SetEndPoint(w http.ResponseWriter, r *http.Request) {
	h.setEndpoint(w, r, "endPoint")
}

func (h *Handler) setEndpoint(w http.ResponseWriter, r *http.Request, field string) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	tour, status, errMsg := h.loadOwnedTour(r, claims.UserID)
	if errMsg != "" {
		writeError(w, status, errMsg)
		return
	}

	var req models.AddKeyPointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
		writeError(w, http.StatusBadRequest, "latitude/longitude out of range")
		return
	}

	keyPoint := models.KeyPoint{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		Description: req.Description,
		Image:       req.Image,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		CreatedAt:   time.Now(),
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	_, err := h.Collection.UpdateOne(ctx,
		bson.M{"_id": tour.ID},
		bson.M{"$set": bson.M{field: keyPoint}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to set "+field)
		return
	}

	writeJSON(w, http.StatusOK, keyPoint)
}

func (h *Handler) loadOwnedTour(r *http.Request, authorID int64) (models.Tour, int, string) {
	idParam := r.PathValue("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		return models.Tour{}, http.StatusBadRequest, "invalid tour id"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var tour models.Tour
	err = h.Collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&tour)
	if err == mongo.ErrNoDocuments {
		return models.Tour{}, http.StatusNotFound, "tour not found"
	}
	if err != nil {
		return models.Tour{}, http.StatusInternalServerError, "failed to load tour"
	}

	if tour.AuthorID != authorID {
		return models.Tour{}, http.StatusForbidden, "you are not the author of this tour"
	}

	return tour, 0, ""
}
func (h *Handler) PublishTour(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	idParam := r.PathValue("id")

	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tour id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var tour models.Tour

	err = h.Collection.FindOne(
		ctx,
		bson.M{"_id": objID},
	).Decode(&tour)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "tour not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tour")
		return
	}

	if tour.AuthorID != claims.UserID {
		writeError(w, http.StatusForbidden, "you are not the author of this tour")
		return
	}

	if tour.Status != models.StatusDraft {
		writeError(w, http.StatusBadRequest, "only draft tours can be published")
		return
	}

	_, err = h.Collection.UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{
			"$set": bson.M{
				"status": models.StatusPublished,
			},
		},
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to publish tour")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status": "published",
	})
}
func (h *Handler) SetTourPrice(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	idParam := r.PathValue("id")

	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tour id")
		return
	}

	var req struct {
		Price float64 `json:"price"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Price < 0 {
		writeError(w, http.StatusBadRequest, "price cannot be negative")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var tour models.Tour

	err = h.Collection.FindOne(
		ctx,
		bson.M{"_id": objID},
	).Decode(&tour)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "tour not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tour")
		return
	}

	if tour.AuthorID != claims.UserID {
		writeError(w, http.StatusForbidden, "you are not the author of this tour")
		return
	}

	_, err = h.Collection.UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{
			"$set": bson.M{
				"price": req.Price,
			},
		},
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update price")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status": "price updated",
		"price":  req.Price,
	})
}

func (h *Handler) GetPurchaseInfo(w http.ResponseWriter, r *http.Request) {
	idParam := r.PathValue("id")

	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tour id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var tour models.Tour

	err = h.Collection.FindOne(
		ctx,
		bson.M{"_id": objID},
	).Decode(&tour)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "tour not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tour")
		return
	}

	if tour.Status != models.StatusPublished {
		writeError(w, http.StatusBadRequest, "tour is not available for purchase")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":          tour.ID.Hex(),
		"name":        tour.Name,
		"description": tour.Description,
		"status":      tour.Status,
		"price":       tour.Price,
	})
}

func (h *Handler) GetPublicTour(w http.ResponseWriter, r *http.Request) {
	idParam := r.PathValue("id")

	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tour id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var tour models.Tour

	err = h.Collection.FindOne(
		ctx,
		bson.M{"_id": objID},
	).Decode(&tour)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "tour not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tour")
		return
	}

	if tour.Status != models.StatusPublished && tour.Status != models.StatusArchived {
		writeError(w, http.StatusNotFound, "tour is not available")
		return
	}

	response := map[string]interface{}{
		"id":              tour.ID.Hex(),
		"authorId":        tour.AuthorID,
		"authorName":      tour.AuthorName,
		"name":            tour.Name,
		"description":     tour.Description,
		"difficulty":      tour.Difficulty,
		"tags":            tour.Tags,
		"status":          tour.Status,
		"price":           tour.Price,
		"durationMinutes": tour.DurationMinutes,
		"images":          tour.Images,
		"startPoint":      tour.StartPoint,
		"endPoint":        nil,
		"createdAt":       tour.CreatedAt,
	}

	authHeader := r.Header.Get("Authorization")

	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)

		if len(parts) == 2 && parts[0] == "Bearer" {
			claims, err := auth.ParseToken(parts[1])

			if err != nil {
				log.Println("GetPublicTour: invalid token:", err)
			} else {
				purchased, err := checkPurchase(
					tour.ID.Hex(),
					claims.UserID,
					parts[1],
				)

				if err != nil {
					log.Println("GetPublicTour: checkPurchase failed:", err)
				} else if purchased {
					response["endPoint"] = tour.EndPoint
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, response)
}
func (h *Handler) ArchiveTour(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	idParam := r.PathValue("id")

	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tour id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var tour models.Tour

	err = h.Collection.FindOne(
		ctx,
		bson.M{"_id": objID},
	).Decode(&tour)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "tour not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tour")
		return
	}

	if tour.AuthorID != claims.UserID {
		writeError(w, http.StatusForbidden, "you are not the author of this tour")
		return
	}

	if tour.Status != models.StatusPublished {
		writeError(w, http.StatusBadRequest, "only published tours can be archived")
		return
	}

	_, err = h.Collection.UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{
			"$set": bson.M{
				"status": models.StatusArchived,
			},
		},
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to archive tour")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status": "archived",
	})
}

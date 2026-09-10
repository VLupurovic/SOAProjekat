package handlers

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"tour-service/internal/models"
)

const proximityThresholdMeters = 50.0

func haversineMeters(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371000.0
	toRad := func(deg float64) float64 { return deg * math.Pi / 180 }

	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

func tokenFromRequest(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) == 2 && parts[0] == "Bearer" {
		return parts[1]
	}
	return ""
}

func (h *Handler) StartExecution(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}
	if claims.Role != "tourist" {
		writeError(w, http.StatusForbidden, "only tourists can start a tour execution")
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
	err = h.Collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&tour)
	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "tour not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tour")
		return
	}

	if tour.Status != models.StatusPublished && tour.Status != models.StatusArchived {
		writeError(w, http.StatusBadRequest, "tour must be published or archived to start execution")
		return
	}

	var existing models.TourExecution
	err = h.ExecutionCollection.FindOne(ctx, bson.M{
		"tourId":    objID,
		"touristId": claims.UserID,
		"status":    models.ExecutionActive,
	}).Decode(&existing)
	if err == nil {
		writeError(w, http.StatusConflict, "you already have an active execution for this tour")
		return
	}
	if err != mongo.ErrNoDocuments {
		writeError(w, http.StatusInternalServerError, "failed to check existing execution")
		return
	}

	purchased, err := checkPurchase(tour.ID.Hex(), claims.UserID, tokenFromRequest(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to verify purchase")
		return
	}
	if !purchased {
		writeError(w, http.StatusForbidden, "tour must be purchased before starting execution")
		return
	}

	var req models.StartExecutionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
		writeError(w, http.StatusBadRequest, "invalid coordinates")
		return
	}

	now := time.Now()
	execution := models.TourExecution{
		TourID:          objID,
		TouristID:       claims.UserID,
		Status:          models.ExecutionActive,
		StartLatitude:   req.Latitude,
		StartLongitude:  req.Longitude,
		CompletedPoints: []models.CompletedPoint{},
		StartedAt:       now,
		LastActivity:    now,
	}

	result, err := h.ExecutionCollection.InsertOne(ctx, execution)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start execution")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": result.InsertedID,
	})
}

func (h *Handler) loadActiveExecution(ctx context.Context, tourObjID primitive.ObjectID, touristID int64) (models.TourExecution, error) {
	var exec models.TourExecution
	err := h.ExecutionCollection.FindOne(ctx, bson.M{
		"tourId":    tourObjID,
		"touristId": touristID,
		"status":    models.ExecutionActive,
	}).Decode(&exec)
	return exec, err
}

func (h *Handler) CheckProximity(w http.ResponseWriter, r *http.Request) {
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

	var req models.CheckProximityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
		writeError(w, http.StatusBadRequest, "invalid coordinates")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	execution, err := h.loadActiveExecution(ctx, objID, claims.UserID)
	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "no active execution for this tour")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load execution")
		return
	}

	var tour models.Tour
	err = h.Collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&tour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tour")
		return
	}

	alreadyCompleted := map[string]bool{}
	for _, cp := range execution.CompletedPoints {
		alreadyCompleted[cp.PointType] = true
	}

	newlyCompleted := []string{}
	now := time.Now()

	checkPoint := func(pointType string, kp *models.KeyPoint) {
		if kp == nil || alreadyCompleted[pointType] {
			return
		}
		dist := haversineMeters(req.Latitude, req.Longitude, kp.Latitude, kp.Longitude)
		if dist <= proximityThresholdMeters {
			execution.CompletedPoints = append(execution.CompletedPoints, models.CompletedPoint{
				PointType:   pointType,
				Name:        kp.Name,
				CompletedAt: now,
			})
			newlyCompleted = append(newlyCompleted, pointType)
		}
	}

	checkPoint("startPoint", tour.StartPoint)
	checkPoint("endPoint", tour.EndPoint)

	execution.LastActivity = now

	_, err = h.ExecutionCollection.UpdateOne(ctx,
		bson.M{"_id": execution.ID},
		bson.M{"$set": bson.M{
			"completedPoints": execution.CompletedPoints,
			"lastActivity":    execution.LastActivity,
		}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update execution")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"newlyCompleted":  newlyCompleted,
		"completedPoints": execution.CompletedPoints,
		"lastActivity":    execution.LastActivity,
	})
}

func (h *Handler) finishExecution(w http.ResponseWriter, r *http.Request, status models.ExecutionStatus) {
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

	execution, err := h.loadActiveExecution(ctx, objID, claims.UserID)
	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "no active execution for this tour")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load execution")
		return
	}

	now := time.Now()

	_, err = h.ExecutionCollection.UpdateOne(ctx,
		bson.M{"_id": execution.ID},
		bson.M{"$set": bson.M{
			"status":       status,
			"endedAt":      now,
			"lastActivity": now,
		}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update execution")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": string(status)})
}

func (h *Handler) CompleteExecution(w http.ResponseWriter, r *http.Request) {
	h.finishExecution(w, r, models.ExecutionCompleted)
}

func (h *Handler) AbandonExecution(w http.ResponseWriter, r *http.Request) {
	h.finishExecution(w, r, models.ExecutionAbandoned)
}

func (h *Handler) GetActiveExecution(w http.ResponseWriter, r *http.Request) {
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

	execution, err := h.loadActiveExecution(ctx, objID, claims.UserID)
	if err == mongo.ErrNoDocuments {
		writeJSON(w, http.StatusNoContent, nil)
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load execution")
		return
	}

	writeJSON(w, http.StatusOK, execution)
}

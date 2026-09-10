package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"purchase-service/internal/auth"
	"purchase-service/internal/models"
)

type Handler struct {
	Collection         *mongo.Collection
	PurchaseCollection *mongo.Collection
}

func New(
	collection *mongo.Collection,
	purchaseCollection *mongo.Collection,
) *Handler {
	return &Handler{
		Collection:         collection,
		PurchaseCollection: purchaseCollection,
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}

func tourServiceURL() string {
	url := os.Getenv("TOUR_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8083"
	}
	return url
}

func getTour(tourID string) (models.TourInfo, error) {
	resp, err := http.Get(
		tourServiceURL() + "/tours/" + tourID + "/purchase-info",
	)
	if err != nil {
		return models.TourInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)

		return models.TourInfo{}, fmt.Errorf(
			"tour-service returned %d: %s",
			resp.StatusCode,
			string(body),
		)
	}

	var tour models.TourInfo

	if err := json.NewDecoder(resp.Body).Decode(&tour); err != nil {
		return models.TourInfo{}, err
	}

	return tour, nil
}

func (h *Handler) GetCart(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	if claims.Role != "tourist" {
		writeError(w, http.StatusForbidden, "only tourists can use the shopping cart")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var cart models.ShoppingCart

	err := h.Collection.FindOne(
		ctx,
		bson.M{"touristId": claims.UserID},
	).Decode(&cart)

	if err == mongo.ErrNoDocuments {
		writeJSON(w, http.StatusOK, models.ShoppingCart{
			TouristID:  claims.UserID,
			Items:      []models.OrderItem{},
			TotalPrice: 0,
		})
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}

	writeJSON(w, http.StatusOK, cart)
}

func (h *Handler) AddToCart(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	if claims.Role != "tourist" {
		writeError(w, http.StatusForbidden, "only tourists can use the shopping cart")
		return
	}

	var req models.AddToCartRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TourID == "" {
		writeError(w, http.StatusBadRequest, "tourId is required")
		return
	}

	tour, err := getTour(req.TourID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "tour is not available for purchase")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var cart models.ShoppingCart

	err = h.Collection.FindOne(
		ctx,
		bson.M{"touristId": claims.UserID},
	).Decode(&cart)

	if err == mongo.ErrNoDocuments {
		cart = models.ShoppingCart{
			TouristID:  claims.UserID,
			Items:      []models.OrderItem{},
			TotalPrice: 0,
			UpdatedAt:  time.Now(),
		}
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}

	for _, existing := range cart.Items {
		if existing.TourID == tour.ID {
			writeError(w, http.StatusConflict, "this tour is already in your cart")
			return
		}
	}

	item := models.OrderItem{
		ID:       primitive.NewObjectID().Hex(),
		TourID:   tour.ID,
		TourName: tour.Name,
		Price:    tour.Price,
	}

	cart.Items = append(cart.Items, item)
	cart.TotalPrice += item.Price
	cart.UpdatedAt = time.Now()

	if cart.ID == "" {
		result, err := h.Collection.InsertOne(ctx, cart)

		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create cart")
			return
		}

		if objectID, ok := result.InsertedID.(primitive.ObjectID); ok {
			cart.ID = objectID.Hex()
		}
	} else {
		_, err := h.Collection.UpdateOne(
			ctx,
			bson.M{"touristId": claims.UserID},
			bson.M{
				"$set": bson.M{
					"items":      cart.Items,
					"totalPrice": cart.TotalPrice,
					"updatedAt":  cart.UpdatedAt,
				},
			},
		)

		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update cart")
			return
		}
	}

	writeJSON(w, http.StatusCreated, cart)
}

func (h *Handler) RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	if claims.Role != "tourist" {
		writeError(w, http.StatusForbidden, "only tourists can use the shopping cart")
		return
	}

	tourID := r.PathValue("tourId")

	if tourID == "" {
		writeError(w, http.StatusBadRequest, "tourId is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var cart models.ShoppingCart

	err := h.Collection.FindOne(
		ctx,
		bson.M{"touristId": claims.UserID},
	).Decode(&cart)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "cart not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}

	found := false
	newItems := make([]models.OrderItem, 0, len(cart.Items))

	for _, item := range cart.Items {
		if item.TourID == tourID {
			found = true
			continue
		}

		newItems = append(newItems, item)
	}

	if !found {
		writeError(w, http.StatusNotFound, "tour is not in cart")
		return
	}

	cart.Items = newItems

	cart.TotalPrice = 0

	for _, item := range cart.Items {
		cart.TotalPrice += item.Price
	}

	cart.UpdatedAt = time.Now()

	_, err = h.Collection.UpdateOne(
		ctx,
		bson.M{"touristId": claims.UserID},
		bson.M{
			"$set": bson.M{
				"items":      cart.Items,
				"totalPrice": cart.TotalPrice,
				"updatedAt":  cart.UpdatedAt,
			},
		},
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update cart")
		return
	}

	writeJSON(w, http.StatusOK, cart)
}

func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	if claims.Role != "tourist" {
		writeError(w, http.StatusForbidden, "only tourists can use the shopping cart")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var cart models.ShoppingCart

	err := h.Collection.FindOne(
		ctx,
		bson.M{"touristId": claims.UserID},
	).Decode(&cart)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "cart not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load cart")
		return
	}

	if len(cart.Items) == 0 {
		writeError(w, http.StatusBadRequest, "cart is empty")
		return
	}

	tokens := make([]models.TourPurchaseToken, 0, len(cart.Items))

	for _, item := range cart.Items {

		tour, err := getTour(item.TourID)
		if err != nil {
			writeError(
				w,
				http.StatusBadRequest,
				"tour "+item.TourID+" is no longer available for purchase",
			)
			return
		}

		randomBytes := make([]byte, 32)

		if _, err := rand.Read(randomBytes); err != nil {
			writeError(
				w,
				http.StatusInternalServerError,
				"failed to generate purchase token",
			)
			return
		}

		token := hex.EncodeToString(randomBytes)

		purchaseToken := models.TourPurchaseToken{
			ID:        primitive.NewObjectID().Hex(),
			TouristID: claims.UserID,
			TourID:    tour.ID,
			TourName:  tour.Name,
			Price:     tour.Price,
			Token:     token,
			CreatedAt: time.Now(),
		}

		_, err = h.PurchaseCollection.InsertOne(ctx, purchaseToken)

		if err != nil {
			writeError(
				w,
				http.StatusInternalServerError,
				"failed to create purchase token",
			)
			return
		}

		tokens = append(tokens, purchaseToken)
	}

	_, err = h.Collection.UpdateOne(
		ctx,
		bson.M{"touristId": claims.UserID},
		bson.M{
			"$set": bson.M{
				"items":      []models.OrderItem{},
				"totalPrice": 0,
				"updatedAt":  time.Now(),
			},
		},
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to clear cart")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status": "checkout successful",
		"tokens": tokens,
	})
}

func (h *Handler) HasPurchased(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	tourID := r.PathValue("tourId")

	if tourID == "" {
		writeError(w, http.StatusBadRequest, "tourId is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var purchase models.TourPurchaseToken

	err := h.PurchaseCollection.FindOne(
		ctx,
		bson.M{
			"touristId": claims.UserID,
			"tourId":    tourID,
		},
	).Decode(&purchase)

	if err == mongo.ErrNoDocuments {
		writeJSON(w, http.StatusOK, map[string]bool{
			"purchased": false,
		})
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to check purchase")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{
		"purchased": true,
	})
}
func (h *Handler) ListMyPurchases(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r)

	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	if claims.Role != "tourist" {
		writeError(w, http.StatusForbidden, "only tourists have purchases")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cursor, err := h.PurchaseCollection.Find(
		ctx,
		bson.M{"touristId": claims.UserID},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load purchases")
		return
	}
	defer cursor.Close(ctx)

	purchases := []models.TourPurchaseToken{}
	if err := cursor.All(ctx, &purchases); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read purchases")
		return
	}

	writeJSON(w, http.StatusOK, purchases)
}

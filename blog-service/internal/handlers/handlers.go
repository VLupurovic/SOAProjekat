package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"blog-service/internal/models"
)

type Handler struct {
	Collection         *mongo.Collection
	CommentsCollection *mongo.Collection
}

func New(collection *mongo.Collection, commentsCollection *mongo.Collection) *Handler {
	return &Handler{
		Collection:         collection,
		CommentsCollection: commentsCollection,
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

func stakeholdersServiceURL() string {
	url := os.Getenv("STAKEHOLDERS_SERVICE_URL")
	if url == "" {
		url = "http://localhost:8081"
	}
	return url
}

func (h *Handler) CreateBlog(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	var req models.CreateBlogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title == "" || req.Description == "" {
		writeError(w, http.StatusBadRequest, "title and description are required")
		return
	}

	blog := models.Blog{
		AuthorID:    claims.UserID,
		AuthorName:  claims.Username,
		Title:       req.Title,
		Description: req.Description,
		Images:      req.Images,
		CreatedAt:   time.Now(),
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	result, err := h.Collection.InsertOne(ctx, blog)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create blog")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": result.InsertedID,
	})
}

func (h *Handler) ListBlogs(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.Collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load blogs")
		return
	}
	defer cursor.Close(ctx)

	var blogs []models.Blog
	if err := cursor.All(ctx, &blogs); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read blogs")
		return
	}

	if blogs == nil {
		blogs = []models.Blog{}
	}

	writeJSON(w, http.StatusOK, blogs)
}

func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing or invalid token")
		return
	}

	blogID, err := primitive.ObjectIDFromHex(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid blog id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var blog models.Blog

	err = h.Collection.FindOne(
		ctx,
		bson.M{"_id": blogID},
	).Decode(&blog)

	if err == mongo.ErrNoDocuments {
		writeError(w, http.StatusNotFound, "blog not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load blog")
		return
	}

	followURL := fmt.Sprintf(
		"%s/users/%d/following",
		stakeholdersServiceURL(),
		blog.AuthorID,
	)

	followReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		followURL,
		nil,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create follow request")
		return
	}

	followReq.Header.Set(
		"Authorization",
		r.Header.Get("Authorization"),
	)

	resp, err := http.DefaultClient.Do(followReq)
	if err != nil {
		log.Println("CreateComment: failed to call stakeholders-service:", err)
		writeError(w, http.StatusInternalServerError, "failed to check follow status")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("CreateComment: stakeholders-service returned status %d for url %s\n", resp.StatusCode, followURL)
		writeError(w, http.StatusInternalServerError, "failed to check follow status")
		return
	}

	var followResult struct {
		Following bool `json:"following"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&followResult); err != nil {
		writeError(w, http.StatusInternalServerError, "invalid follow response")
		return
	}

	log.Printf("CreateComment: followURL=%s followResult.Following=%v\n", followURL, followResult.Following)

	if !followResult.Following {
		writeError(
			w,
			http.StatusForbidden,
			"You must follow the blog author before commenting",
		)
		return
	}

	var req models.CreateCommentRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}

	comment := models.Comment{
		ID:         primitive.NewObjectID(),
		BlogID:     blog.ID,
		AuthorID:   claims.UserID,
		AuthorName: claims.Username,
		Content:    req.Content,
		CreatedAt:  time.Now(),
	}

	_, err = h.CommentsCollection.InsertOne(ctx, comment)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create comment")
		return
	}

	writeJSON(w, http.StatusCreated, comment)
}

func getFollowingUserIDs(
	ctx context.Context,
	r *http.Request,
) ([]int64, error) {

	url := fmt.Sprintf(
		"%s/users/following",
		stakeholdersServiceURL(),
	)

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		url,
		nil,
	)

	if err != nil {
		return nil, err
	}

	req.Header.Set(
		"Authorization",
		r.Header.Get("Authorization"),
	)

	resp, err := http.DefaultClient.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf(
			"stakeholders-service returned status %d",
			resp.StatusCode,
		)
	}

	var users []struct {
		ID int64 `json:"id"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}

	ids := make([]int64, 0, len(users))

	for _, user := range users {
		ids = append(ids, user.ID)
	}

	return ids, nil
}

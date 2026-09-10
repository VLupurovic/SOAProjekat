package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Blog struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	AuthorID    int64              `bson:"authorId" json:"authorId"`
	AuthorName  string             `bson:"authorName" json:"authorName"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	Images      []string           `bson:"images" json:"images"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}

type CreateBlogRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Images      []string `json:"images"`
}

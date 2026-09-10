package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Comment struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BlogID     primitive.ObjectID `bson:"blogId" json:"blogId"`
	AuthorID   int64              `bson:"authorId" json:"authorId"`
	AuthorName string             `bson:"authorName" json:"authorName"`
	Content    string             `bson:"content" json:"content"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}

type CreateCommentRequest struct {
	Content string `json:"content"`
}

package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Difficulty string

const (
	DifficultyEasy     Difficulty = "easy"
	DifficultyModerate Difficulty = "moderate"
	DifficultyHard     Difficulty = "hard"
)

type Status string

const (
	StatusDraft     Status = "draft"
	StatusPublished Status = "published"
	StatusArchived  Status = "archived"
)

type KeyPoint struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Image       string             `bson:"image" json:"image"`
	Latitude    float64            `bson:"latitude" json:"latitude"`
	Longitude   float64            `bson:"longitude" json:"longitude"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}

type Tour struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	AuthorID        int64              `bson:"authorId" json:"authorId"`
	AuthorName      string             `bson:"authorName" json:"authorName"`
	Name            string             `bson:"name" json:"name"`
	Description     string             `bson:"description" json:"description"`
	Difficulty      Difficulty         `bson:"difficulty" json:"difficulty"`
	Tags            []string           `bson:"tags" json:"tags"`
	Status          Status             `bson:"status" json:"status"`
	Price           float64            `bson:"price" json:"price"`
	DurationMinutes int                `bson:"durationMinutes" json:"durationMinutes"`
	Images          []string           `bson:"images" json:"images"`
	StartPoint      *KeyPoint          `bson:"startPoint,omitempty" json:"startPoint"`
	EndPoint        *KeyPoint          `bson:"endPoint,omitempty" json:"endPoint"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	PublishedAt     *time.Time         `bson:"publishedAt,omitempty" json:"publishedAt"`
	ArchivedAt      *time.Time         `bson:"archivedAt,omitempty" json:"archivedAt"`
}

type SetPriceRequest struct {
	Price float64 `json:"price"`
}

type CreateTourRequest struct {
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	Difficulty      Difficulty `json:"difficulty"`
	Tags            []string   `json:"tags"`
	DurationMinutes int        `json:"durationMinutes"`
	Images          []string   `json:"images"`
}

type AddKeyPointRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Image       string  `json:"image"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

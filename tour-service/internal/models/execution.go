package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ExecutionStatus string

const (
	ExecutionActive    ExecutionStatus = "active"
	ExecutionCompleted ExecutionStatus = "completed"
	ExecutionAbandoned ExecutionStatus = "abandoned"
)

type CompletedPoint struct {
	PointType   string    `bson:"pointType" json:"pointType"`
	Name        string    `bson:"name" json:"name"`
	CompletedAt time.Time `bson:"completedAt" json:"completedAt"`
}

type TourExecution struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TourID          primitive.ObjectID `bson:"tourId" json:"tourId"`
	TouristID       int64              `bson:"touristId" json:"touristId"`
	Status          ExecutionStatus    `bson:"status" json:"status"`
	StartLatitude   float64            `bson:"startLatitude" json:"startLatitude"`
	StartLongitude  float64            `bson:"startLongitude" json:"startLongitude"`
	CompletedPoints []CompletedPoint   `bson:"completedPoints" json:"completedPoints"`
	StartedAt       time.Time          `bson:"startedAt" json:"startedAt"`
	EndedAt         *time.Time         `bson:"endedAt,omitempty" json:"endedAt"`
	LastActivity    time.Time          `bson:"lastActivity" json:"lastActivity"`
}

type StartExecutionRequest struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type CheckProximityRequest struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

package models

import "time"

type OrderItem struct {
	ID       string  `bson:"id" json:"id"`
	TourID   string  `bson:"tourId" json:"tourId"`
	TourName string  `bson:"tourName" json:"tourName"`
	Price    float64 `bson:"price" json:"price"`
}

type ShoppingCart struct {
	ID         string      `bson:"_id,omitempty" json:"id"`
	TouristID  int64       `bson:"touristId" json:"touristId"`
	Items      []OrderItem `bson:"items" json:"items"`
	TotalPrice float64     `bson:"totalPrice" json:"totalPrice"`
	UpdatedAt  time.Time   `bson:"updatedAt" json:"updatedAt"`
}

type AddToCartRequest struct {
	TourID string `json:"tourId"`
}

type TourInfo struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Price       float64 `json:"price"`
}

type TourPurchaseToken struct {
	ID        string    `bson:"_id,omitempty" json:"id"`
	TouristID int64     `bson:"touristId" json:"touristId"`
	TourID    string    `bson:"tourId" json:"tourId"`
	TourName  string    `bson:"tourName" json:"tourName"`
	Price     float64   `bson:"price" json:"price"`
	Token     string    `bson:"token" json:"token"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}

package models

type Position struct {
	UserID    int64   `json:"userId"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	UpdatedAt string  `json:"updatedAt"`
}

type SetPositionRequest struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

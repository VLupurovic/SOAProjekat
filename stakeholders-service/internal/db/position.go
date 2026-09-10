package db

import (
	"database/sql"
	"stakeholders-service/internal/models"
)

func GetPosition(db *sql.DB, userID int64) (*models.Position, error) {
	var p models.Position
	err := db.QueryRow(
		`SELECT user_id, latitude, longitude, updated_at
         FROM tourist_positions WHERE user_id = $1`, userID,
	).Scan(&p.UserID, &p.Latitude, &p.Longitude, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func UpsertPosition(db *sql.DB, userID int64, lat, lng float64) error {
	_, err := db.Exec(`
        INSERT INTO tourist_positions (user_id, latitude, longitude, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET latitude = $2, longitude = $3, updated_at = NOW()`,
		userID, lat, lng,
	)
	return err
}

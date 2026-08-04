package main

import (
	"log"
	"net/http"

	"stakeholders-service/internal/db"
	"stakeholders-service/internal/handlers"
)

func main() {
	database, err := db.Connect()
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	h := handlers.New(database)

	http.HandleFunc("/register", h.Register)

	log.Println("Server running on :8080")

	log.Fatal(http.ListenAndServe(":8080", nil))
}

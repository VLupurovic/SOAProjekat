package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"tour-service/internal/db"
	"tour-service/internal/handlers"
)

func main() {
	client, err := db.Connect()
	if err != nil {
		log.Fatalf("failed to connect to mongo: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		client.Disconnect(ctx)
	}()

	dbName := os.Getenv("MONGO_DB_NAME")
	if dbName == "" {
		dbName = "tourdb"
	}
	collection := client.Database(dbName).Collection("tours")
	executionCollection := client.Database(dbName).Collection("tourExecutions")

	h := handlers.New(collection, executionCollection)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /tours", handlers.CORS(handlers.RequireAuth(handlers.RequireGuide(h.CreateTour))))
	mux.HandleFunc("OPTIONS /tours", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /tours", handlers.CORS(h.ListPublishedTours))

	mux.HandleFunc("GET /tours/mine", handlers.CORS(handlers.RequireAuth(h.ListMyTours)))
	mux.HandleFunc("OPTIONS /tours/mine", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /tours/{id}", handlers.CORS(handlers.RequireAuth(h.GetTour)))
	mux.HandleFunc("OPTIONS /tours/{id}", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("PUT /tours/{id}/startpoint", handlers.CORS(handlers.RequireAuth(handlers.RequireGuide(h.SetStartPoint))))
	mux.HandleFunc("OPTIONS /tours/{id}/startpoint", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("PUT /tours/{id}/endpoint", handlers.CORS(handlers.RequireAuth(handlers.RequireGuide(h.SetEndPoint))))
	mux.HandleFunc("OPTIONS /tours/{id}/endpoint", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("PUT /tours/{id}/publish", handlers.CORS(handlers.RequireAuth(handlers.RequireGuide(h.PublishTour))))
	mux.HandleFunc("OPTIONS /tours/{id}/publish", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("PUT /tours/{id}/price", handlers.CORS(handlers.RequireAuth(handlers.RequireGuide(h.SetTourPrice))))
	mux.HandleFunc("OPTIONS /tours/{id}/price", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("PUT /tours/{id}/archive", handlers.CORS(handlers.RequireAuth(handlers.RequireGuide(h.ArchiveTour))))
	mux.HandleFunc("OPTIONS /tours/{id}/archive", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /tours/{id}/purchase-info", handlers.CORS(h.GetPurchaseInfo))
	mux.HandleFunc("OPTIONS /tours/{id}/purchase-info", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /tours/{id}/public", handlers.CORS(h.GetPublicTour))
	mux.HandleFunc("OPTIONS /tours/{id}/public", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("POST /tours/{id}/execution/start", handlers.CORS(handlers.RequireAuth(h.StartExecution)))
	mux.HandleFunc("OPTIONS /tours/{id}/execution/start", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /tours/{id}/execution", handlers.CORS(handlers.RequireAuth(h.GetActiveExecution)))
	mux.HandleFunc("OPTIONS /tours/{id}/execution", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("POST /tours/{id}/execution/check-proximity", handlers.CORS(handlers.RequireAuth(h.CheckProximity)))
	mux.HandleFunc("OPTIONS /tours/{id}/execution/check-proximity", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("PUT /tours/{id}/execution/complete", handlers.CORS(handlers.RequireAuth(h.CompleteExecution)))
	mux.HandleFunc("OPTIONS /tours/{id}/execution/complete", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("PUT /tours/{id}/execution/abandon", handlers.CORS(handlers.RequireAuth(h.AbandonExecution)))
	mux.HandleFunc("OPTIONS /tours/{id}/execution/abandon", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	log.Printf("tour-service listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

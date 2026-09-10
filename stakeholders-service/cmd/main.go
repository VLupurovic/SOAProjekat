package main

import (
	"log"
	"net/http"
	"os"

	"stakeholders-service/internal/db"
	"stakeholders-service/internal/handlers"
)

func main() {
	conn, err := db.Connect()
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer conn.Close()

	migrationSQL, err := os.ReadFile("migrations/001_init.sql")
	if err != nil {
		log.Fatalf("failed to read migration file: %v", err)
	}
	if err := db.RunMigrations(conn, string(migrationSQL)); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	h := handlers.New(conn)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /register", handlers.CORS(h.Register))
	mux.HandleFunc("OPTIONS /register", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("POST /login", handlers.CORS(h.Login))
	mux.HandleFunc("OPTIONS /login", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /profile", handlers.CORS(handlers.RequireAuth(h.GetProfile)))
	mux.HandleFunc("OPTIONS /profile", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))
	mux.HandleFunc("PUT /profile", handlers.CORS(handlers.RequireAuth(h.UpdateProfile)))

	mux.HandleFunc("POST /users/{id}/follow", handlers.CORS(handlers.RequireAuth(h.FollowUser)))
	mux.HandleFunc("OPTIONS /users/{id}/follow", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /users/{id}/following", handlers.CORS(handlers.RequireAuth(h.IsFollowing)))
	mux.HandleFunc("OPTIONS /users/{id}/following", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /position", handlers.CORS(handlers.RequireAuth(h.GetPosition)))
	mux.HandleFunc("PUT /position", handlers.CORS(handlers.RequireAuth(h.SetPosition)))
	mux.HandleFunc("OPTIONS /position", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /users/following", handlers.CORS(handlers.RequireAuth(h.GetFollowing)))
	mux.HandleFunc("OPTIONS /users/following", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /users/recommendations", handlers.CORS(handlers.RequireAuth(h.GetRecommendations)))
	mux.HandleFunc("OPTIONS /users/recommendations", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("stakeholders-service listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

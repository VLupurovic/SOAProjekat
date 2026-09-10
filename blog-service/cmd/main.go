package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"blog-service/internal/db"
	"blog-service/internal/handlers"
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
		dbName = "blogdb"
	}
	collection := client.Database(dbName).Collection("blogs")
	commentsCollection := client.Database(dbName).Collection("comments")

	h := handlers.New(collection, commentsCollection)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /blogs", handlers.CORS(handlers.RequireAuth(h.CreateBlog)))
	mux.HandleFunc("OPTIONS /blogs", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))
	mux.HandleFunc("GET /blogs", handlers.CORS(h.ListBlogs))

	mux.HandleFunc("POST /blogs/{id}/comments", handlers.CORS(handlers.RequireAuth(h.CreateComment)))
	mux.HandleFunc("OPTIONS /blogs/{id}/comments", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("blog-service listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

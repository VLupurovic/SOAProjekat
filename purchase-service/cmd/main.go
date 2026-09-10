package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"google.golang.org/grpc"

	"purchase-service/internal/auth"
	"purchase-service/internal/db"
	"purchase-service/internal/handlers"

	pb "soaprojekat/proto/purchase"
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
		dbName = "purchasedb"
	}

	collection := client.Database(dbName).Collection("carts")
	purchaseCollection := client.Database(dbName).Collection("purchaseTokens")

	h := handlers.New(collection, purchaseCollection)

	go func() {
		grpcPort := os.Getenv("GRPC_PORT")
		if grpcPort == "" {
			grpcPort = "50054"
		}

		lis, err := net.Listen("tcp", ":"+grpcPort)
		if err != nil {
			log.Fatalf("failed to listen on grpc port: %v", err)
		}

		grpcServer := grpc.NewServer()
		pb.RegisterPurchaseServiceServer(grpcServer, handlers.NewGRPCServer(purchaseCollection))

		log.Printf("purchase-service gRPC listening on :%s", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("grpc server error: %v", err)
		}
	}()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /cart", handlers.CORS(auth.RequireAuth(h.GetCart)))
	mux.HandleFunc("OPTIONS /cart", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("POST /cart/items", handlers.CORS(auth.RequireAuth(h.AddToCart)))
	mux.HandleFunc("OPTIONS /cart/items", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("DELETE /cart/items/{tourId}", handlers.CORS(auth.RequireAuth(h.RemoveFromCart)))
	mux.HandleFunc("OPTIONS /cart/items/{tourId}", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("POST /cart/checkout", handlers.CORS(auth.RequireAuth(h.Checkout)))
	mux.HandleFunc("OPTIONS /cart/checkout", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /purchases/check/{tourId}", handlers.CORS(auth.RequireAuth(h.HasPurchased)))
	mux.HandleFunc("OPTIONS /purchases/check/{tourId}", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	mux.HandleFunc("GET /purchases/mine", handlers.CORS(auth.RequireAuth(h.ListMyPurchases)))
	mux.HandleFunc("OPTIONS /purchases/mine", handlers.CORS(func(w http.ResponseWriter, r *http.Request) {}))

	port := os.Getenv("PORT")

	if port == "" {
		port = "8084"
	}

	log.Printf("purchase-service listening on :%s", port)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

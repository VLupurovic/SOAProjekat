package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

func proxyTo(target string) http.HandlerFunc {
	targetURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("invalid target url: %v", err)
	}
	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	return func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	stakeholders := getEnv("STAKEHOLDERS_SERVICE_URL", "http://localhost:8081")
	blog := getEnv("BLOG_SERVICE_URL", "http://localhost:8082")
	tour := getEnv("TOUR_SERVICE_URL", "http://localhost:8083")
	purchase := getEnv("PURCHASE_SERVICE_URL", "http://localhost:8084")

	mux := http.NewServeMux()

	mux.HandleFunc("/register", proxyTo(stakeholders))
	mux.HandleFunc("/login", proxyTo(stakeholders))
	mux.HandleFunc("/profile", proxyTo(stakeholders))
	mux.HandleFunc("/users/", proxyTo(stakeholders))
	mux.HandleFunc("/position", proxyTo(stakeholders))

	mux.HandleFunc("/blogs", proxyTo(blog))
	mux.HandleFunc("/blogs/", proxyTo(blog))

	mux.HandleFunc("/tours", proxyTo(tour))
	mux.HandleFunc("/tours/", proxyTo(tour))

	mux.HandleFunc("/cart", proxyTo(purchase))
	mux.HandleFunc("/cart/", proxyTo(purchase))
	mux.HandleFunc("/purchases/", proxyTo(purchase))

	port := getEnv("PORT", "8080")
	log.Printf("api-gateway listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

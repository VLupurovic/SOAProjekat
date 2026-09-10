package handlers

import (
	"context"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "soaprojekat/proto/purchase"
)

var purchaseGRPCClient pb.PurchaseServiceClient

func purchaseGRPCAddress() string {
	addr := os.Getenv("PURCHASE_SERVICE_GRPC_ADDR")
	if addr == "" {
		addr = "localhost:50054"
	}
	return addr
}

func getPurchaseClient() (pb.PurchaseServiceClient, error) {
	if purchaseGRPCClient != nil {
		return purchaseGRPCClient, nil
	}

	conn, err := grpc.NewClient(
		purchaseGRPCAddress(),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}

	purchaseGRPCClient = pb.NewPurchaseServiceClient(conn)
	return purchaseGRPCClient, nil
}

func checkPurchase(tourID string, userID int64, token string) (bool, error) {
	client, err := getPurchaseClient()
	if err != nil {
		return false, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.CheckPurchase(ctx, &pb.CheckPurchaseRequest{
		TourId:    tourID,
		TouristId: userID,
	})
	if err != nil {
		return false, err
	}

	return resp.Purchased, nil
}

package handlers

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	pb "soaprojekat/proto/purchase"
)

type GRPCServer struct {
	pb.UnimplementedPurchaseServiceServer
	PurchaseCollection *mongo.Collection
}

func NewGRPCServer(purchaseCollection *mongo.Collection) *GRPCServer {
	return &GRPCServer{PurchaseCollection: purchaseCollection}
}

func (s *GRPCServer) CheckPurchase(ctx context.Context, req *pb.CheckPurchaseRequest) (*pb.CheckPurchaseResponse, error) {
	var purchase struct {
		TouristID int64  `bson:"touristId"`
		TourID    string `bson:"tourId"`
	}

	err := s.PurchaseCollection.FindOne(ctx, bson.M{
		"touristId": req.TouristId,
		"tourId":    req.TourId,
	}).Decode(&purchase)

	if err == mongo.ErrNoDocuments {
		return &pb.CheckPurchaseResponse{Purchased: false}, nil
	}
	if err != nil {
		return nil, err
	}

	return &pb.CheckPurchaseResponse{Purchased: true}, nil
}

FROM golang:1.26 AS build
WORKDIR /app

COPY proto/purchase ./proto/purchase
COPY purchase-service/go.mod purchase-service/go.sum ./purchase-service/
WORKDIR /app/purchase-service
RUN go mod download

WORKDIR /app
COPY purchase-service ./purchase-service
WORKDIR /app/purchase-service
RUN CGO_ENABLED=0 GOOS=linux go build -o purchase-service ./cmd

FROM alpine:3.20
WORKDIR /app

COPY --from=build /app/purchase-service/purchase-service .

EXPOSE 8084
CMD ["./purchase-service"]
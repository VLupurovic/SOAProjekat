FROM golang:1.26 AS build
WORKDIR /app

COPY proto/purchase ./proto/purchase
COPY tour-service/go.mod tour-service/go.sum ./tour-service/
WORKDIR /app/tour-service
RUN go mod download

WORKDIR /app
COPY tour-service ./tour-service
WORKDIR /app/tour-service
RUN CGO_ENABLED=0 GOOS=linux go build -o tour-service ./cmd

FROM alpine:3.20
WORKDIR /app

COPY --from=build /app/tour-service/tour-service .

EXPOSE 8083
CMD ["./tour-service"]
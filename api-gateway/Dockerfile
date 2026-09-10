FROM golang:1.26 AS build
WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o api-gateway ./cmd

FROM alpine:3.20
WORKDIR /app

COPY --from=build /app/api-gateway .

EXPOSE 8080
CMD ["./api-gateway"]
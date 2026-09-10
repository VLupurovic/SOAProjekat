FROM golang:1.26 AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o stakeholders-service ./cmd

FROM alpine:3.20
WORKDIR /app

COPY --from=build /app/stakeholders-service .
COPY --from=build /app/migrations ./migrations

EXPOSE 8081
CMD ["./stakeholders-service"]
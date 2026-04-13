FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/freshmart ./cmd/server

FROM alpine:3.20

WORKDIR /app

RUN adduser -D -H -u 10001 appuser

COPY --from=builder /bin/freshmart /app/freshmart

USER appuser

EXPOSE 8080

ENTRYPOINT ["/app/freshmart"]

FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY Uptime-Daddy ./Uptime-Daddy

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/server ./Uptime-Daddy/cmd/server

FROM alpine:3.21

WORKDIR /app

COPY --from=builder /out/server ./server

EXPOSE 6969

CMD ["./server"]

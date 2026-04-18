FROM golang:1.25-alpine AS builder

WORKDIR /src

# Kopiér modul-filer og al Go-kilde (discord-worker + service-account), så `go mod tidy`
# kan matche imports — undgår "updates to go.mod needed" under `go build`.
COPY go.mod go.sum ./
COPY Uptime-Daddy ./Uptime-Daddy

RUN go mod tidy && go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/server ./Uptime-Daddy/cmd/server
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/discord-worker ./Uptime-Daddy/cmd/discord-worker

FROM alpine:3.21

WORKDIR /app

COPY --from=builder /out/server ./server
COPY --from=builder /out/discord-worker ./discord-worker

EXPOSE 6969

CMD ["./server"]

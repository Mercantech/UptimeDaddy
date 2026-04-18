package main

import (
	"errors"
	"log"
	"net/http"
	"os"

	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/db"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/handler"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/middleware"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/models"
	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/routes"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env"); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatalf("loading .env: %v", err)
	}

	port := os.Getenv("PORT")

	if err := db.Connect(); err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}

	if err := db.DB.AutoMigrate(&models.Accounts{}); err != nil {
		log.Fatal("Failed to migrate DB:", err)
	}

	mux := http.NewServeMux()
	routes.RegisterAccountRoutes(mux, routes.AccountHandlers{
		Register: handler.CreateAccountHandler,
		Login:    handler.LoginHandler,
		Refresh:  handler.RefreshTokenHandler,
	})

	handlerWithCORS := middleware.WithCORS(mux)

	log.Printf("Server running on %s", port)
	if err := http.ListenAndServe(port, handlerWithCORS); err != nil {
		log.Fatal("Server failed:", err)
	}
}

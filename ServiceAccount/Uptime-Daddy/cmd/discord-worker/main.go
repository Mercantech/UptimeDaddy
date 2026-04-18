package main

import (
	"log"
	"os"

	"github.com/Mercantec-GHC/h5-h5-projekt-template/Uptime-Daddy/discordworker"
)

func main() {
	if err := discordworker.Run(); err != nil {
		log.Printf("discord-worker: %v", err)
		os.Exit(1)
	}
}

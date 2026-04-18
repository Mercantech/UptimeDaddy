package discordworker

import (
	"fmt"
	"os"
	"strings"
)

// Config indlæses fra miljøvariabler (docker-compose / .env).
type Config struct {
	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string
	MqttHost         string
	MqttPort         string
	DiscordBotToken  string
	MetricsAddr      string
}

func LoadConfig() (*Config, error) {
	c := &Config{
		PostgresHost:     strings.TrimSpace(os.Getenv("POSTGRES_HOST")),
		PostgresPort:     strings.TrimSpace(os.Getenv("POSTGRES_PORT")),
		PostgresUser:     strings.TrimSpace(os.Getenv("POSTGRES_USER")),
		PostgresPassword: os.Getenv("POSTGRES_PASSWORD"),
		PostgresDB:       strings.TrimSpace(os.Getenv("POSTGRES_DB")),
		MqttHost:         strings.TrimSpace(os.Getenv("MQTT_HOST")),
		MqttPort:         strings.TrimSpace(os.Getenv("MQTT_PORT")),
		DiscordBotToken:  strings.TrimSpace(os.Getenv("DISCORD_BOT_TOKEN")),
		MetricsAddr:      strings.TrimSpace(os.Getenv("DISCORD_WORKER_METRICS_ADDR")),
	}
	if c.MetricsAddr == "" {
		c.MetricsAddr = ":6970"
	}
	if c.PostgresPort == "" {
		c.PostgresPort = "5432"
	}
	if c.MqttPort == "" {
		c.MqttPort = "1883"
	}
	if c.PostgresHost == "" || c.PostgresUser == "" || c.PostgresDB == "" {
		return nil, fmt.Errorf("POSTGRES_HOST, POSTGRES_USER og POSTGRES_DB skal være sat")
	}
	if c.MqttHost == "" {
		return nil, fmt.Errorf("MQTT_HOST skal være sat")
	}
	if c.DiscordBotToken == "" {
		return nil, fmt.Errorf("DISCORD_BOT_TOKEN skal være sat")
	}
	return c, nil
}

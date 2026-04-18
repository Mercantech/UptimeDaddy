package discordworker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func openPool(ctx context.Context, c *Config) (*pgxpool.Pool, error) {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		c.PostgresUser,
		c.PostgresPassword,
		c.PostgresHost,
		c.PostgresPort,
		c.PostgresDB,
	)
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 8
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour
	return pgxpool.NewWithConfig(ctx, cfg)
}

type resolvedChannel struct {
	ChannelID string
}

func resolveChannelForWebsite(ctx context.Context, pool *pgxpool.Pool, websiteID int64) (*resolvedChannel, error) {
	const q = `
SELECT COALESCE(NULLIF(TRIM(ds.channel_id_override), ''), NULLIF(TRIM(di.default_channel_id), '')) AS channel_id
FROM websites w
JOIN discord_integrations di ON di.user_id = w.user_id AND di.enabled = TRUE
JOIN discord_monitor_subscriptions ds ON ds.website_id = w.id AND ds.notification_enabled = TRUE
WHERE w.id = $1
LIMIT 1`
	var ch string
	err := pool.QueryRow(ctx, q, websiteID).Scan(&ch)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("ingen aktiv discord-konfiguration for website %d", websiteID)
		}
		return nil, err
	}
	if strings.TrimSpace(ch) == "" {
		return nil, fmt.Errorf("tom kanal for website %d", websiteID)
	}
	return &resolvedChannel{ChannelID: strings.TrimSpace(ch)}, nil
}

func resolveChannelForReport(ctx context.Context, pool *pgxpool.Pool, userID int64, scheduleChannel *string) (*resolvedChannel, error) {
	if scheduleChannel != nil && strings.TrimSpace(*scheduleChannel) != "" {
		return &resolvedChannel{ChannelID: strings.TrimSpace(*scheduleChannel)}, nil
	}
	const q = `
SELECT default_channel_id FROM discord_integrations
WHERE user_id = $1 AND enabled = TRUE
LIMIT 1`
	var def string
	err := pool.QueryRow(ctx, q, userID).Scan(&def)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(def) == "" {
		return nil, fmt.Errorf("ingen default kanal for bruger %d", userID)
	}
	return &resolvedChannel{ChannelID: strings.TrimSpace(def)}, nil
}

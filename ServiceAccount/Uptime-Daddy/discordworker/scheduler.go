package discordworker

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"
)

func runReportSchedulerLoop(ctx context.Context, pool *pgxpool.Pool, session *discordgo.Session, st *stats) {
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := tickSchedules(ctx, pool, session, parser, st); err != nil {
				log.Printf("scheduler: %v", err)
			}
		}
	}
}

func tickSchedules(
	ctx context.Context,
	pool *pgxpool.Pool,
	session *discordgo.Session,
	parser cron.ScheduleParser,
	st *stats,
) error {
	rows, err := pool.Query(ctx, `
SELECT id, user_id, channel_id, cron_expression, report_type, last_run_at, created_at
FROM discord_report_schedules
WHERE enabled = TRUE`)
	if err != nil {
		return err
	}
	defer rows.Close()

	now := time.Now().UTC()
	for rows.Next() {
		var id, userID int64
		var channel *string
		var cronExpr, reportType string
		var lastRun *time.Time
		var createdAt time.Time
		if err := rows.Scan(&id, &userID, &channel, &cronExpr, &reportType, &lastRun, &createdAt); err != nil {
			return err
		}

		sched, err := parser.Parse(cronExpr)
		if err != nil {
			log.Printf("scheduler: ugyldig cron for schedule %d: %v", id, err)
			continue
		}

		anchor := createdAt
		if lastRun != nil {
			anchor = *lastRun
		}
		next := sched.Next(anchor)
		if now.Before(next) {
			continue
		}

		ch, err := resolveChannelForReport(ctx, pool, userID, channel)
		if err != nil {
			log.Printf("scheduler: kanal for schedule %d: %v", id, err)
			continue
		}

		body, err := buildSummaryReport(ctx, pool, userID, nil, 24*time.Hour)
		if err != nil {
			log.Printf("schedule %d build report: %v", id, err)
			continue
		}

		hdr := fmt.Sprintf("**Planlagt rapport** (`%s`, schedule %d)\n\n", reportType, id)
		if err := sendDiscordMessage(session, ch.ChannelID, hdr+body); err != nil {
			st.fail()
			log.Printf("schedule %d discord: %v", id, err)
			continue
		}
		st.ok()

		if _, err := pool.Exec(ctx, `UPDATE discord_report_schedules SET last_run_at = $1 WHERE id = $2`, now, id); err != nil {
			log.Printf("schedule %d update last_run: %v", id, err)
		}
	}
	return rows.Err()
}

package discordworker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func buildSummaryReport(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID int64,
	websiteIDs []int64,
	window time.Duration,
) (string, error) {
	from := time.Now().UTC().Add(-window)
	var rows pgx.Rows
	var err error
	if len(websiteIDs) == 0 {
		const q = `
SELECT w.id, w.url,
  COUNT(m.id)::bigint AS checks,
  COALESCE(SUM(CASE WHEN m.status_code >= 200 AND m.status_code < 300 THEN 1 ELSE 0 END), 0)::bigint AS up_checks
FROM websites w
LEFT JOIN measurements m ON m.website_id = w.id AND m.created_at >= $1
WHERE w.user_id = $2
GROUP BY w.id, w.url
ORDER BY w.id`
		rows, err = pool.Query(ctx, q, from, userID)
	} else {
		const q = `
SELECT w.id, w.url,
  COUNT(m.id)::bigint AS checks,
  COALESCE(SUM(CASE WHEN m.status_code >= 200 AND m.status_code < 300 THEN 1 ELSE 0 END), 0)::bigint AS up_checks
FROM websites w
LEFT JOIN measurements m ON m.website_id = w.id AND m.created_at >= $1
WHERE w.user_id = $2 AND w.id = ANY($3::bigint[])
GROUP BY w.id, w.url
ORDER BY w.id`
		rows, err = pool.Query(ctx, q, from, userID, websiteIDs)
	}
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var b strings.Builder
	fmt.Fprintf(&b, "**UptimeDaddy rapport** (sidste %s, UTC)\n", window.String())
	fmt.Fprintf(&b, "Workspace/bruger-id: `%d`\n\n", userID)

	any := false
	for rows.Next() {
		any = true
		var id int64
		var url string
		var checks, upChecks int64
		if err := rows.Scan(&id, &url, &checks, &upChecks); err != nil {
			return "", err
		}
		uptimePct := 0.0
		if checks > 0 {
			uptimePct = (float64(upChecks) / float64(checks)) * 100
		}
		fmt.Fprintf(&b, "• `%s` (id %d): %.1f%% uptime (%d/%d checks)\n", url, id, uptimePct, upChecks, checks)
	}
	if err := rows.Err(); err != nil {
		return "", err
	}
	if !any {
		b.WriteString("_Ingen websites fundet for rapporten._\n")
	}
	return b.String(), nil
}

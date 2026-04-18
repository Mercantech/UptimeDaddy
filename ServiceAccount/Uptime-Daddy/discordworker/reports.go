package discordworker

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Embed-farve matcher frontend-akcent (--grøn/teal typisk omkring #408A71).
const embedColorUptimeDaddy = 0x408A71

type reportSiteRow struct {
	ID       int64
	URL      string
	Checks   int64
	UpChecks int64
	// Gennemsnit af total_time_ms for alle checks i vinduet (nil hvis ingen målinger).
	AvgTotalMs *float64
	// Seneste måling i vinduet — samme felter som dashboard / TimingCell (curl-kumulative ms).
	LastStatus      *int32
	LastDNSMs       *float64
	LastConnectMs   *float64
	LastTLSMs       *float64
	LastTTFBMs      *float64
	LastTotalMs     *float64
	LastCheckAt     *time.Time
}

func querySummaryReportRows(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID int64,
	websiteIDs []int64,
	window time.Duration,
) ([]reportSiteRow, error) {
	from := time.Now().UTC().Add(-window)
	var rows pgx.Rows
	var err error
	if len(websiteIDs) == 0 {
		const q = `
SELECT w.id, w.url,
  COUNT(m.id)::bigint AS checks,
  COALESCE(SUM(CASE WHEN m.status_code >= 200 AND m.status_code < 300 THEN 1 ELSE 0 END), 0)::bigint AS up_checks,
  AVG(m.total_time_ms) FILTER (WHERE m.id IS NOT NULL) AS avg_total_ms,
  lm.status_code,
  lm.dns_lookup_ms,
  lm.connect_ms,
  lm.tls_handshake_ms,
  lm.time_to_first_byte_ms,
  lm.total_time_ms,
  lm.created_at
FROM websites w
LEFT JOIN measurements m ON m.website_id = w.id AND m.created_at >= $1
LEFT JOIN LATERAL (
  SELECT m2.status_code, m2.dns_lookup_ms, m2.connect_ms, m2.tls_handshake_ms,
         m2.time_to_first_byte_ms, m2.total_time_ms, m2.created_at
  FROM measurements m2
  WHERE m2.website_id = w.id AND m2.created_at >= $1
  ORDER BY m2.created_at DESC
  LIMIT 1
) lm ON TRUE
WHERE w.user_id = $2
GROUP BY w.id, w.url,
  lm.status_code, lm.dns_lookup_ms, lm.connect_ms, lm.tls_handshake_ms,
  lm.time_to_first_byte_ms, lm.total_time_ms, lm.created_at
ORDER BY w.id`
		rows, err = pool.Query(ctx, q, from, userID)
	} else {
		const q = `
SELECT w.id, w.url,
  COUNT(m.id)::bigint AS checks,
  COALESCE(SUM(CASE WHEN m.status_code >= 200 AND m.status_code < 300 THEN 1 ELSE 0 END), 0)::bigint AS up_checks,
  AVG(m.total_time_ms) FILTER (WHERE m.id IS NOT NULL) AS avg_total_ms,
  lm.status_code,
  lm.dns_lookup_ms,
  lm.connect_ms,
  lm.tls_handshake_ms,
  lm.time_to_first_byte_ms,
  lm.total_time_ms,
  lm.created_at
FROM websites w
LEFT JOIN measurements m ON m.website_id = w.id AND m.created_at >= $1
LEFT JOIN LATERAL (
  SELECT m2.status_code, m2.dns_lookup_ms, m2.connect_ms, m2.tls_handshake_ms,
         m2.time_to_first_byte_ms, m2.total_time_ms, m2.created_at
  FROM measurements m2
  WHERE m2.website_id = w.id AND m2.created_at >= $1
  ORDER BY m2.created_at DESC
  LIMIT 1
) lm ON TRUE
WHERE w.user_id = $2 AND w.id = ANY($3::bigint[])
GROUP BY w.id, w.url,
  lm.status_code, lm.dns_lookup_ms, lm.connect_ms, lm.tls_handshake_ms,
  lm.time_to_first_byte_ms, lm.total_time_ms, lm.created_at
ORDER BY w.id`
		rows, err = pool.Query(ctx, q, from, userID, websiteIDs)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []reportSiteRow
	for rows.Next() {
		var r reportSiteRow
		var avgTotal sql.NullFloat64
		var lastStatus sql.NullInt64
		var lastDNS, lastConn, lastTLS, lastTTFB, lastTotal sql.NullFloat64
		var lastAt sql.NullTime
		if err := rows.Scan(
			&r.ID, &r.URL, &r.Checks, &r.UpChecks,
			&avgTotal,
			&lastStatus, &lastDNS, &lastConn, &lastTLS, &lastTTFB, &lastTotal, &lastAt,
		); err != nil {
			return nil, err
		}
		if avgTotal.Valid {
			v := avgTotal.Float64
			r.AvgTotalMs = &v
		}
		if lastStatus.Valid {
			v := int32(lastStatus.Int64)
			r.LastStatus = &v
		}
		if lastDNS.Valid {
			v := lastDNS.Float64
			r.LastDNSMs = &v
		}
		if lastConn.Valid {
			v := lastConn.Float64
			r.LastConnectMs = &v
		}
		if lastTLS.Valid {
			v := lastTLS.Float64
			r.LastTLSMs = &v
		}
		if lastTTFB.Valid {
			v := lastTTFB.Float64
			r.LastTTFBMs = &v
		}
		if lastTotal.Valid {
			v := lastTotal.Float64
			r.LastTotalMs = &v
		}
		if lastAt.Valid {
			t := lastAt.Time.UTC()
			r.LastCheckAt = &t
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func uptimeStatusEmoji(pct float64) string {
	switch {
	case pct >= 99.5:
		return "🟢"
	case pct >= 90:
		return "🟡"
	default:
		return "🔴"
	}
}

// shortSiteLabel viser host + evt. path (uden skema), som i dashboard — fx cedce.eu/webinar/
func shortSiteLabel(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "—"
	}
	u, err := url.Parse(raw)
	if err != nil {
		if len(raw) > 72 {
			return raw[:69] + "…"
		}
		return raw
	}
	if u.Host == "" && strings.Contains(raw, ".") {
		u2, err2 := url.Parse("https://" + strings.TrimPrefix(strings.TrimPrefix(raw, "//"), "http:"))
		if err2 == nil && u2.Host != "" {
			u = u2
		}
	}
	if u.Host == "" {
		if len(raw) > 72 {
			return raw[:69] + "…"
		}
		return raw
	}
	host := u.Host
	path := strings.TrimSuffix(u.Path, "/")
	if path != "" && path != "/" {
		s := host + u.Path
		s = strings.TrimSuffix(s, "/")
		if len(s) > 80 {
			return s[:77] + "…"
		}
		return s
	}
	if len(host) > 80 {
		return host[:77] + "…"
	}
	return host
}

func embedFieldName(emoji, label string) string {
	s := emoji + " " + label
	if len(s) > 256 {
		return s[:253] + "…"
	}
	return s
}

func embedFieldValue(r reportSiteRow, uptimePct float64) string {
	var b strings.Builder
	fmt.Fprintf(&b,
		"**%.1f%%** uptime · `%d` / `%d` checks · id `%d`",
		uptimePct, r.UpChecks, r.Checks, r.ID,
	)
	if r.Checks > 0 && r.AvgTotalMs != nil {
		fmt.Fprintf(&b, "\nGns. **%.0f ms** total (%d checks i vinduet)", *r.AvgTotalMs, r.Checks)
	}
	if r.LastTotalMs != nil && r.LastCheckAt != nil {
		st := "-"
		if r.LastStatus != nil {
			st = fmt.Sprintf("%d", *r.LastStatus)
		}
		fmt.Fprintf(&b, "\n**Seneste:** %s UTC · HTTP `%s` · **%.0f ms** total",
			r.LastCheckAt.UTC().Format("02.01.2006 15:04"), st, *r.LastTotalMs,
		)
		if r.LastDNSMs != nil && r.LastConnectMs != nil && r.LastTLSMs != nil && r.LastTTFBMs != nil {
			fmt.Fprintf(&b,
				"\n· DNS `%.0f` · forb. `%.0f` · TLS `%.0f` · TTFB `%.0f` _(kumulativ, som dashboard)_",
				*r.LastDNSMs, *r.LastConnectMs, *r.LastTLSMs, *r.LastTTFBMs,
			)
		}
	} else if r.Checks == 0 {
		b.WriteString("\n_Ingen målinger i vinduet._")
	}
	s := b.String()
	if len(s) > 1024 {
		s = s[:1021] + "…"
	}
	return s
}

const maxEmbedFields = 25 // Discord hard limit pr. embed

func buildSummaryEmbeds(
	rows []reportSiteRow,
	embedTitle string,
	window time.Duration,
	userID int64,
) []*discordgo.MessageEmbed {
	meta := fmt.Sprintf(
		"Sidste **%s** · UTC · workspace `%d`\n_Seneste_ = nyeste check i vinduet (samme tal som tabellen). _Gns._ = gennemsnitlig totaltid for alle checks i vinduet.",
		formatDurationHuman(window),
		userID,
	)

		if len(rows) == 0 {
		return []*discordgo.MessageEmbed{
			{
				Title:       embedTitle,
				Description: meta + "\n\n_Ingen websites i vinduet — tilføj monitors eller vent på målinger._",
				Color:       embedColorUptimeDaddy,
				Footer:      &discordgo.MessageEmbedFooter{Text: BrandLine("Uptime Daddy")},
			},
		}
	}

	var embeds []*discordgo.MessageEmbed
	totalSites := len(rows)
	for offset := 0; offset < len(rows); offset += maxEmbedFields {
		end := offset + maxEmbedFields
		if end > len(rows) {
			end = len(rows)
		}
		chunk := rows[offset:end]
		fields := make([]*discordgo.MessageEmbedField, 0, len(chunk))
		for _, r := range chunk {
			uptimePct := 0.0
			if r.Checks > 0 {
				uptimePct = (float64(r.UpChecks) / float64(r.Checks)) * 100
			}
			em := uptimeStatusEmoji(uptimePct)
			nameEm := strings.TrimSpace(strings.TrimSpace(EmojiFavicon()) + " " + em)
			fields = append(fields, &discordgo.MessageEmbedField{
				Name:   embedFieldName(nameEm, shortSiteLabel(r.URL)),
				Value:  embedFieldValue(r, uptimePct),
				Inline: true,
			})
		}

		e := &discordgo.MessageEmbed{
			Color:  embedColorUptimeDaddy,
			Fields: fields,
		}
		if offset == 0 {
			e.Title = embedTitle
			e.Description = meta
		} else {
			e.Title = BrandLine("… flere monitors")
			e.Description = "_Samme rapport — flere rækker._"
		}
		if end >= totalSites {
			e.Footer = &discordgo.MessageEmbedFooter{
				Text: BrandLine(fmt.Sprintf("Uptime Daddy · %d monitor%s", totalSites, pluralS(totalSites))),
			}
		}
		embeds = append(embeds, e)
	}
	return embeds
}

func pluralS(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}

// formatDurationHuman giver kortere vinduestekst end Go's default (fx "24h" i stedet for "24h0m0s").
func formatDurationHuman(d time.Duration) string {
	if d <= 0 {
		return "0"
	}
	if d >= time.Hour && d%time.Hour == 0 {
		return fmt.Sprintf("%dh", int(d/time.Hour))
	}
	if d >= time.Minute && d%time.Minute == 0 {
		return fmt.Sprintf("%dm", int(d/time.Minute))
	}
	if d < time.Minute {
		return d.Round(time.Second).String()
	}
	return d.Round(time.Minute).String()
}

// buildSummaryReportEmbeds henter data og bygger ét eller flere embeds (chunk ved >25 sites).
func buildSummaryReportEmbeds(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID int64,
	websiteIDs []int64,
	window time.Duration,
	embedTitle string,
) ([]*discordgo.MessageEmbed, error) {
	rows, err := querySummaryReportRows(ctx, pool, userID, websiteIDs, window)
	if err != nil {
		return nil, err
	}
	return buildSummaryEmbeds(rows, embedTitle, window, userID), nil
}

package discordworker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/bwmarrin/discordgo"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

const (
	topicNotificationEvents = "uptime/discord/notification_events"
	topicReportRequests     = "uptime/discord/report_requests"
)

type stats struct {
	processed atomic.Uint64
	failures  atomic.Uint64
	discordOK atomic.Uint64
}

func (s *stats) ok() {
	s.processed.Add(1)
	s.discordOK.Add(1)
}

func (s *stats) fail() {
	s.processed.Add(1)
	s.failures.Add(1)
}

type idempotencyCache struct {
	mu sync.Mutex
	m  map[string]time.Time
	ttl time.Duration
}

func newIdempotencyCache(ttl time.Duration) *idempotencyCache {
	c := &idempotencyCache{m: make(map[string]time.Time), ttl: ttl}
	go c.cleanupLoop()
	return c
}

func (c *idempotencyCache) shouldSkipProcessed(key string) bool {
	if key == "" {
		return false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if t, ok := c.m[key]; ok && time.Since(t) < c.ttl {
		return true
	}
	return false
}

func (c *idempotencyCache) markProcessed(key string) {
	if key == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = time.Now()
}

func (c *idempotencyCache) cleanupLoop() {
	t := time.NewTicker(5 * time.Minute)
	defer t.Stop()
	for range t.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.m {
			if now.Sub(v) > c.ttl {
				delete(c.m, k)
			}
		}
		c.mu.Unlock()
	}
}

// Run starter MQTT-consumer, rapport-scheduler og let HTTP-stats.
func Run() error {
	_ = godotenv.Load(".env")

	cfg, err := LoadConfig()
	if err != nil {
		return err
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	pool, err := openPool(ctx, cfg)
	if err != nil {
		return fmt.Errorf("postgres: %w", err)
	}
	defer pool.Close()

	dg, err := discordgo.New("Bot " + cfg.DiscordBotToken)
	if err != nil {
		return fmt.Errorf("discord session: %w", err)
	}

	// Gateway: online-status + slash-kommandoer (InteractionCreate).
	dg.Identify.Intents = discordgo.IntentsGuilds
	dg.AddHandler(onReadyRegisterSlashCommands)
	dg.AddHandler(newSlashInteractionHandler(pool))

	if err := dg.Open(); err != nil {
		return fmt.Errorf("discord gateway: %w", err)
	}
	defer func() {
		if cerr := dg.Close(); cerr != nil {
			log.Printf("discord gateway luk: %v", cerr)
		}
	}()

	st := &stats{}
	idem := newIdempotencyCache(24 * time.Hour)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if err := pool.Ping(r.Context()); err != nil {
			http.Error(w, "db unhealthy", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"eventsProcessed": st.processed.Load(),
			"eventsFailed":    st.failures.Load(),
			"discordSendsOK":  st.discordOK.Load(),
		})
	})
	srv := &http.Server{Addr: cfg.MetricsAddr, Handler: mux}
	go func() {
		log.Printf("discord-worker metrics på %s (/health, /stats)", cfg.MetricsAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("http server: %v", err)
		}
	}()
	go func() {
		<-ctx.Done()
		_ = srv.Shutdown(context.Background())
	}()

	go runReportSchedulerLoop(ctx, pool, dg, st)

	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:%s", cfg.MqttHost, cfg.MqttPort))
	opts.SetClientID(fmt.Sprintf("uptimedaddy-discord-%d", time.Now().UnixNano()))
	opts.SetKeepAlive(60)
	opts.SetAutoReconnect(true)
	opts.SetConnectRetry(true)
	opts.SetConnectRetryInterval(5 * time.Second)
	opts.SetOrderMatters(false)

	opts.OnConnect = func(c mqtt.Client) {
		log.Println("mqtt: forbundet")
		if t := c.Subscribe(topicNotificationEvents, 1, mqttMessageHandler(pool, dg, st, idem)); t.Wait() && t.Error() != nil {
			log.Printf("mqtt subscribe %s: %v", topicNotificationEvents, t.Error())
		}
		if t := c.Subscribe(topicReportRequests, 1, mqttMessageHandler(pool, dg, st, idem)); t.Wait() && t.Error() != nil {
			log.Printf("mqtt subscribe %s: %v", topicReportRequests, t.Error())
		}
	}

	client := mqtt.NewClient(opts)
	if t := client.Connect(); t.Wait() && t.Error() != nil {
		return fmt.Errorf("mqtt connect: %w", t.Error())
	}
	defer client.Disconnect(250)

	log.Println("discord-worker kører (Ctrl+C for stop)")
	<-ctx.Done()
	log.Println("discord-worker stopper...")
	return nil
}

func mqttMessageHandler(pool *pgxpool.Pool, dg *discordgo.Session, st *stats, idem *idempotencyCache) mqtt.MessageHandler {
	return func(_ mqtt.Client, msg mqtt.Message) {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		var probe struct {
			EventType string `json:"eventType"`
		}
		if err := json.Unmarshal(msg.Payload(), &probe); err != nil {
			log.Printf("mqtt: ugyldig json: %v", err)
			st.fail()
			return
		}

		switch probe.EventType {
		case "monitor_status":
			var ev monitorStatusNotificationEvent
			if err := json.Unmarshal(msg.Payload(), &ev); err != nil {
				log.Printf("monitor_status parse: %v", err)
				st.fail()
				return
			}
			if idem.shouldSkipProcessed(ev.IdempotencyKey) {
				return
			}
			if err := handleMonitorStatus(ctx, pool, dg, ev); err != nil {
				log.Printf("monitor_status: %v", err)
				st.fail()
				return
			}
			st.ok()
			idem.markProcessed(ev.IdempotencyKey)
		case "report_request":
			var ev discordReportRequestEvent
			if err := json.Unmarshal(msg.Payload(), &ev); err != nil {
				log.Printf("report_request parse: %v", err)
				st.fail()
				return
			}
			if idem.shouldSkipProcessed(ev.IdempotencyKey) {
				return
			}
			if err := handleReportRequest(ctx, pool, dg, ev); err != nil {
				log.Printf("report_request: %v", err)
				st.fail()
				return
			}
			st.ok()
			idem.markProcessed(ev.IdempotencyKey)
		default:
			log.Printf("mqtt: ukendt eventType %q", probe.EventType)
			st.fail()
		}
	}
}

func handleMonitorStatus(ctx context.Context, pool *pgxpool.Pool, dg *discordgo.Session, ev monitorStatusNotificationEvent) error {
	ch, err := resolveChannelForWebsite(ctx, pool, ev.WebsiteID)
	if err != nil {
		return err
	}

	title := "🔴 Nedetid"
	if ev.Status == "up" {
		title = "🟢 Genoprettet"
	}

	body := fmt.Sprintf(
		"%s\n**URL:** %s\n**Website id:** %d\n**Status:** %s → %s (HTTP %d)\n**Responstid:** %.0f ms\n",
		title,
		ev.WebsiteURL,
		ev.WebsiteID,
		ev.PrevStatus,
		ev.Status,
		ev.StatusCode,
		ev.TotalTimeMs,
	)

	return sendDiscordMessage(dg, ch.ChannelID, body)
}

func handleReportRequest(ctx context.Context, pool *pgxpool.Pool, dg *discordgo.Session, ev discordReportRequestEvent) error {
	var schedCh *string
	if ev.ScheduleID != nil {
		var ch *string
		err := pool.QueryRow(ctx, `SELECT channel_id FROM discord_report_schedules WHERE id = $1 AND user_id = $2`, *ev.ScheduleID, ev.WorkspaceID).Scan(&ch)
		if err == nil {
			schedCh = ch
		}
	}

	ch, err := resolveChannelForReport(ctx, pool, ev.WorkspaceID, schedCh)
	if err != nil {
		return err
	}

	title := fmt.Sprintf("📊 Manuel rapport · `%s`", ev.ReportType)
	embeds, err := buildSummaryReportEmbeds(ctx, pool, ev.WorkspaceID, ev.WebsiteIDs, 24*time.Hour, title)
	if err != nil {
		return err
	}

	return sendDiscordRich(dg, ch.ChannelID, "", embeds)
}

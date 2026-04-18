package discordworker

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Slash-navne og shoutout matcher frontend footer (App.jsx: FRONTEND_CREDITS + YouTube-link).
const (
	slashReport   = "daddy-report"
	slashHelp     = "daddy-help"
	slashSkudUd   = "daddy-skudud"
	devYouTubeURL = "https://youtu.be/Hbqz2iEZN10?t=248"
)

type footerCredit struct {
	name string
	url  string
}

// footerCredits skal holdes synkroniseret med Frontend/Uptime-Daddy/src/App.jsx (FRONTEND_CREDITS).
var footerCredits = []footerCredit{
	{"Daniel", "https://github.com/Danielsteenberg-bot"},
	{"Kevin", "https://github.com/KevinNielsen00"},
	{"Kim", "https://github.com/krixzy"},
}

func onReadyRegisterSlashCommands(s *discordgo.Session, r *discordgo.Ready) {
	log.Printf("discord: klar som %s", r.User.Username)

	appID := r.User.ID
	cmds := []*discordgo.ApplicationCommand{
		{
			Name:        slashReport,
			Description: "Post a 24h uptime summary to the configured default channel (requires UptimeDaddy integration)",
		},
		{
			Name:        slashHelp,
			Description: "Show UptimeDaddy slash commands",
		},
		{
			Name:        slashSkudUd,
			Description: "Shout-out: dev GitHub links + YouTube (same as app footer)",
		},
	}

	guildID := strings.TrimSpace(os.Getenv("DISCORD_SLASH_GUILD_ID"))
	var err error
	if guildID != "" {
		_, err = s.ApplicationCommandBulkOverwrite(appID, guildID, cmds)
		if err == nil {
			log.Printf("discord: slash commands registered for guild %s (immediate)", guildID)
		}
	} else {
		_, err = s.ApplicationCommandBulkOverwrite(appID, "", cmds)
		if err == nil {
			log.Println("discord: slash commands registered globally (may take up to ~1h to appear everywhere)")
		}
	}
	if err != nil {
		log.Printf("discord: slash command registration failed: %v", err)
	}
}

func newSlashInteractionHandler(pool *pgxpool.Pool) func(*discordgo.Session, *discordgo.InteractionCreate) {
	return func(s *discordgo.Session, i *discordgo.InteractionCreate) {
		if i.Interaction == nil {
			return
		}
		if i.Type != discordgo.InteractionApplicationCommand {
			return
		}

		data := i.ApplicationCommandData()
		switch data.Name {
		case slashReport:
			handleSlashReport(s, i, pool)
		case slashHelp:
			handleSlashHelp(s, i)
		case slashSkudUd:
			handleSlashSkudUd(s, i)
		default:
			// ukendt — ignorer
		}
	}
}

func handleSlashHelp(s *discordgo.Session, i *discordgo.InteractionCreate) {
	msg := BrandLine("**UptimeDaddy**") + "\n"
	if li := EmojiLogin(); li != "" {
		msg += li + " Web-dashboard & login\n"
	}
	msg += "\n" +
		"• `/daddy-report` — 24h summary to your integration default channel.\n" +
		"• `/daddy-help` — this message.\n" +
		"• `/daddy-skudud` — shout-out: dev names with GitHub links + YouTube (embeds suppressed), same as the web footer.\n\n" +
		"Configure the integration via the UptimeDaddy API (guild and channel IDs). The bot needs **Send Messages** in the target channel."
	_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: msg,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

func handleSlashSkudUd(s *discordgo.Session, i *discordgo.InteractionCreate) {
	msg := buildSkudUdMessage()
	_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: msg,
			// Ingen link-forhåndsvisning (især YouTube-video) — hele beskeden uden embeds.
			Flags: discordgo.MessageFlagsSuppressEmbeds,
		},
	})
}

func buildSkudUdMessage() string {
	var nameLinks []string
	for _, c := range footerCredits {
		nameLinks = append(nameLinks, fmt.Sprintf("[%s](%s)", c.name, c.url))
	}
	// Samme som footer: anchor-teksten "Skud ud til udviklerne" peger på YouTube (ikke separat YT-label).
	head := BrandLine("[Skud ud til udviklerne](" + devYouTubeURL + ")")
	return head + "\n\n" + strings.Join(nameLinks, " · ")
}

func handleSlashReport(s *discordgo.Session, i *discordgo.InteractionCreate, pool *pgxpool.Pool) {
	if i.GuildID == "" {
		_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "This command only works in a **server** where UptimeDaddy is connected.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	var workspaceID int64
	var defaultCh string
	err := pool.QueryRow(ctx, `
SELECT user_id, default_channel_id
FROM discord_integrations
WHERE guild_id = $1 AND enabled = TRUE
LIMIT 1`, i.GuildID).Scan(&workspaceID, &defaultCh)
	if err != nil || strings.TrimSpace(defaultCh) == "" {
		_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "This Discord server is not linked to UptimeDaddy (or the integration is incomplete). Set up the integration and default channel via the API first.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	if err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Flags: discordgo.MessageFlagsEphemeral,
		},
	}); err != nil {
		log.Printf("slash daddy-report: defer respond: %v", err)
		return
	}

	title := BrandLine(fmt.Sprintf("Slash rapport · workspace `%d`", workspaceID))
	embeds, err := buildSummaryReportEmbeds(ctx, pool, workspaceID, nil, 24*time.Hour, title)
	if err != nil {
		editSlashError(s, i, fmt.Sprintf("Could not build report: %v", err))
		return
	}

	if err := sendDiscordRich(s, strings.TrimSpace(defaultCh), "", embeds); err != nil {
		editSlashError(s, i, fmt.Sprintf("Could not post to the channel: %v", err))
		return
	}

	confirm := BrandLine(fmt.Sprintf("Report posted in <#%s>.", strings.TrimSpace(defaultCh)))
	_, err = s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{Content: strPtr(confirm)})
	if err != nil {
		log.Printf("slash daddy-report: edit response: %v", err)
	}
}

func editSlashError(s *discordgo.Session, i *discordgo.InteractionCreate, msg string) {
	if i.Interaction == nil {
		return
	}
	_, err := s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{Content: strPtr(msg)})
	if err != nil {
		log.Printf("slash error edit: %v", err)
	}
}

func strPtr(s string) *string {
	return &s
}

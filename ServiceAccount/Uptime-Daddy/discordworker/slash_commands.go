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

const (
	slashRapport = "udm-rapport"
	slashHjaelp  = "udm-hjaelp"
)

func onReadyRegisterSlashCommands(s *discordgo.Session, r *discordgo.Ready) {
	log.Printf("discord: klar som %s", r.User.Username)

	appID := r.User.ID
	cmds := []*discordgo.ApplicationCommand{
		{
			Name:        slashRapport,
			Description: "Send en 24t uptime-rapport til den konfigurerede Discord-kanal (kræver UptimeDaddy-integration)",
		},
		{
			Name:        slashHjaelp,
			Description: "Vis UptimeDaddy slash-kommandoer",
		},
	}

	guildID := strings.TrimSpace(os.Getenv("DISCORD_SLASH_GUILD_ID"))
	var err error
	if guildID != "" {
		_, err = s.ApplicationCommandBulkOverwrite(appID, guildID, cmds)
		if err == nil {
			log.Printf("discord: slash-kommandoer registreret for guild %s (øjeblikkeligt)", guildID)
		}
	} else {
		_, err = s.ApplicationCommandBulkOverwrite(appID, "", cmds)
		if err == nil {
			log.Println("discord: slash-kommandoer registreret globalt (kan tage op til ca. 1 time at nå alle servere)")
		}
	}
	if err != nil {
		log.Printf("discord: registrering af slash-kommandoer fejlede: %v", err)
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
		case slashRapport:
			handleSlashRapport(s, i, pool)
		case slashHjaelp:
			handleSlashHjaelp(s, i)
		default:
			// ukendt — ignorer
		}
	}
}

func handleSlashHjaelp(s *discordgo.Session, i *discordgo.InteractionCreate) {
	msg := "**UptimeDaddy**\n" +
		"• `/udm-rapport` — genererer en 24t oversigt og poster i den kanal I har sat under integrationen.\n" +
		"• `/udm-hjaelp` — denne hjælp.\n\n" +
		"Integration opsættes via UptimeDaddy API (guild- og kanal-id). Botten skal have **Send Messages** i målkanalen."
	_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: msg,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

func handleSlashRapport(s *discordgo.Session, i *discordgo.InteractionCreate, pool *pgxpool.Pool) {
	if i.GuildID == "" {
		_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Denne kommando virker kun i en **server** (guild), hvor UptimeDaddy er tilkoblet.",
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
				Content: "Denne Discord-server er ikke (eller ikke korrekt) koblet til UptimeDaddy. Opret integration og standardkanal via API’et først.",
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
		log.Printf("slash rapport: defer respond: %v", err)
		return
	}

	body, err := buildSummaryReport(ctx, pool, workspaceID, nil, 24*time.Hour)
	if err != nil {
		editSlashError(s, i, fmt.Sprintf("Kunne ikke bygge rapport: %v", err))
		return
	}

	hdr := fmt.Sprintf("**Slash-rapport** (workspace %d)\n\n", workspaceID)
	full := hdr + body
	if err := sendDiscordMessage(s, strings.TrimSpace(defaultCh), full); err != nil {
		editSlashError(s, i, fmt.Sprintf("Kunne ikke poste i kanalen: %v", err))
		return
	}

	confirm := fmt.Sprintf("Rapporten er sendt i <#%s>.", strings.TrimSpace(defaultCh))
	_, err = s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{Content: strPtr(confirm)})
	if err != nil {
		log.Printf("slash rapport: edit response: %v", err)
	}
}

func editSlashError(s *discordgo.Session, i *discordgo.InteractionCreate, msg string) {
	if i.Interaction == nil {
		return
	}
	_, err := s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{Content: strPtr(msg)})
	if err != nil {
		log.Printf("slash fejl-edit: %v", err)
	}
}

func strPtr(s string) *string {
	return &s
}

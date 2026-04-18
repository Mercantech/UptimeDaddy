package discordworker

import (
	"fmt"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
)

const discordMaxEmbedsPerMessage = 10

// sendDiscordMessage forsøger at sende med eksponentiel backoff (Discord rate limits / transient fejl).
func sendDiscordMessage(session *discordgo.Session, channelID, content string) error {
	if len(content) > 1900 {
		content = content[:1897] + "..."
	}
	var lastErr error
	for attempt := range 4 {
		_, err := session.ChannelMessageSend(channelID, content)
		if err == nil {
			return nil
		}
		lastErr = err
		d := time.Duration(250*(1<<attempt)) * time.Millisecond
		if d > 5*time.Second {
			d = 5 * time.Second
		}
		time.Sleep(d)
	}
	return lastErr
}

// sendDiscordRich sender tekst og/eller embeds. Flere beskeder ved >10 embeds (Discords loft pr. besked).
func sendDiscordRich(session *discordgo.Session, channelID string, content string, embeds []*discordgo.MessageEmbed) error {
	content = strings.TrimSpace(content)
	if len(embeds) == 0 {
		if content == "" {
			return fmt.Errorf("empty rich message")
		}
		return sendDiscordMessage(session, channelID, content)
	}

	var lastErr error
	for start := 0; start < len(embeds); start += discordMaxEmbedsPerMessage {
		end := start + discordMaxEmbedsPerMessage
		if end > len(embeds) {
			end = len(embeds)
		}
		msg := &discordgo.MessageSend{
			Embeds: embeds[start:end],
		}
		if start == 0 && content != "" {
			msg.Content = content
		}

		ok := false
		for attempt := range 4 {
			_, err := session.ChannelMessageSendComplex(channelID, msg)
			if err == nil {
				ok = true
				break
			}
			lastErr = err
			d := time.Duration(250*(1<<attempt)) * time.Millisecond
			if d > 5*time.Second {
				d = 5 * time.Second
			}
			time.Sleep(d)
		}
		if !ok {
			return lastErr
		}
	}
	return nil
}

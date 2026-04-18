package discordworker

import (
	"time"

	"github.com/bwmarrin/discordgo"
)

// sendDiscordMessage forsøger at sende med eksponentiel backoff (Discord rate limits / transient fejl).
func sendDiscordMessage(session *discordgo.Session, channelID, content string) error {
	if len(content) > 1900 {
		content = content[:1897] + "..."
	}
	var last error
	for attempt := range 4 {
		_, err := session.ChannelMessageSend(channelID, content)
		if err == nil {
			return nil
		}
		last = err
		d := time.Duration(250*(1<<attempt)) * time.Millisecond
		if d > 5*time.Second {
			d = 5 * time.Second
		}
		time.Sleep(d)
	}
	return last
}

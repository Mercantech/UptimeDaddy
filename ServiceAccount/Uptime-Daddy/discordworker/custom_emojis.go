package discordworker

import (
	"os"
	"strings"
)

// Standard custom emoji fra jeres Discord (mathiasgs). Format: <:alias:id>
// Botten skal være medlem af serveren hvor emoji er uploadet.
const (
	defaultEmojiLogo    = "<:logo:1495125363968442379>"
	defaultEmojiFavicon = "<:favicon:1495132715660607699>"
	defaultEmojiLogin   = "<:loginImage:1495125413330948289>"
)

// discordEmojiTag læser env eller default. Sæt env til "-" for at slå taget fra.
func discordEmojiTag(envKey, fallback string) string {
	v := strings.TrimSpace(os.Getenv(envKey))
	if v == "-" {
		return ""
	}
	if v != "" {
		return v
	}
	return fallback
}

// EmojiLogo — branding (rapporter, help, bekræftelser).
func EmojiLogo() string {
	return discordEmojiTag("DISCORD_EMOJI_LOGO", defaultEmojiLogo)
}

// EmojiFavicon — pr. site / monitor (rapport-felter, statusbeskeder).
func EmojiFavicon() string {
	return discordEmojiTag("DISCORD_EMOJI_FAVICON", defaultEmojiFavicon)
}

// EmojiLogin — web / login (fx help-tekst).
func EmojiLogin() string {
	return discordEmojiTag("DISCORD_EMOJI_LOGIN", defaultEmojiLogin)
}

// BrandLine sætter logo foran en besked (uden ekstra mellemrum hvis logo mangler).
func BrandLine(msg string) string {
	msg = strings.TrimSpace(msg)
	l := EmojiLogo()
	if l == "" || msg == "" {
		return msg
	}
	return l + " " + msg
}

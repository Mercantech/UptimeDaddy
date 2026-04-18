# API Reference

## Authentication
All controller endpoints require JWT Bearer authentication except where explicitly noted. Include header:

```
Authorization: Bearer <token>
```

## Websites

### GET /api/websites
Returns all websites visible to the authenticated user (or all websites, depending on token).

Response example:

```json
[
  { "id": 1, "url": "https://example.com", "intervalTime": 60, "userId": 1, "faviconBase64": null }
]
```

### POST /api/websites
Create a new website.

Body:

```json
{ "url": "https://example.com", "intervalTime": 60 }
```

Response example:

```json
{ "id": 1, "url": "https://example.com", "intervalTime": 60, "userId": 1 }
```

### PUT /api/websites/{id}/interval
Update monitoring interval for a website.

Body:

```json
{ "intervalTime": 120 }
```

### GET /api/websites/{id}/status
Return the latest measurement for a website.

## Measurements

### GET /api/measurements
(Implement as needed) - returns measurements.

## MQTT Topics
- `uptime/websites/created` - payload when a website is created
- `uptime/websites/updated` - payload when interval or website changes
- `uptime/websites/deleted` - payload when a website is deleted
- `uptime/measurements` - messages from worker devices containing measurement pages
- `uptime/ping/requests` - requests for ping preview
- `uptime/ping/responses` - ping preview responses
- `uptime/discord/notification_events` - monitor status events til Discord worker (JSON: `MonitorStatusNotificationEventDto`)
- `uptime/discord/report_requests` - manuelle rapport-anmodninger til Discord worker (JSON: `DiscordReportRequestEventDto`)

Payloads follow the anonymous object shapes used in `MqttPublishService` and `MqttService`.

## Discord (integration)

Konfigurer integration og notifikationer via JWT-beskyttede endpoints under `/api/discord`.

### GET /api/discord/integration
Returnerer Discord-integration for den aktuelle bruger eller 404.

### PUT /api/discord/integration
Body:

```json
{ "guildId": "1234567890", "defaultChannelId": "1234567890", "enabled": true }
```

### PUT /api/discord/websites/{websiteId}/notifications
Aktiverer notifikationer pr. monitor (påkrævet for at få DOWN/RECOVERED alerts). Valgfri kanal-override.

```json
{ "notificationEnabled": true, "channelIdOverride": null }
```

### GET /api/discord/report-schedules
Lister planlagte rapporter.

### POST /api/discord/report-schedules

```json
{ "channelId": null, "cronExpression": "0 9 * * *", "reportType": "summary", "enabled": true }
```

`channelId` null betyder standardkanal fra integration.

### PUT /api/discord/report-schedules/{id}
Opdaterer en plan.

### DELETE /api/discord/report-schedules/{id}

### POST /api/discord/reports/trigger
Manuel rapport (sender MQTT til Discord worker).

```json
{ "reportType": "summary", "websiteIds": [1, 2] }
```

`websiteIds` kan udelades for alle websites for brugeren.

## Discord slash-kommandoer (bot)

Når **discord-worker** kører med Gateway, registreres globale (eller guild-specifikke med `DISCORD_SLASH_GUILD_ID`) kommandoer:

- `/daddy-report` — 24h summary to the integration **default channel** (requires `guild_id` + channel in the API).
- `/daddy-help` — short help.
- `/daddy-skudud` — samme credits som footer (`App.jsx`): navne med GitHub-links + YouTube; beskeden sendes med **suppress embeds** (ingen video-forhåndsvisning).

Inviter botten med scope **`applications.commands`** (se Backend README).

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

Payloads follow the anonymous object shapes used in `MqttPublishService` and `MqttService`.

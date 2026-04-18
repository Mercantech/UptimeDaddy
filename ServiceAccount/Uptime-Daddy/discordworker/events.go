package discordworker

// JSON-kontrakter matcher .NET DTOs (camelCase).

type monitorStatusNotificationEvent struct {
	EventType            string   `json:"eventType"`
	EventVersion         int      `json:"eventVersion"`
	IdempotencyKey       string   `json:"idempotencyKey"`
	WorkspaceID          int64    `json:"workspaceId"`
	WebsiteID            int64    `json:"websiteId"`
	WebsiteURL           string   `json:"websiteUrl"`
	PrevStatus           string   `json:"prevStatus"`
	Status               string   `json:"status"`
	StatusCode           int      `json:"statusCode"`
	OccurredAt           string   `json:"occurredAt"`
	TotalTimeMs          float64  `json:"totalTimeMs"`
	DowntimeDurationMs   *float64 `json:"downtimeDurationMs,omitempty"`
}

type discordReportRequestEvent struct {
	EventType      string  `json:"eventType"`
	EventVersion   int     `json:"eventVersion"`
	IdempotencyKey string  `json:"idempotencyKey"`
	WorkspaceID    int64   `json:"workspaceId"`
	ReportType     string  `json:"reportType"`
	ScheduleID     *int64  `json:"scheduleId"`
	WebsiteIDs     []int64 `json:"websiteIds"`
	RequestedAt    string  `json:"requestedAt"`
}

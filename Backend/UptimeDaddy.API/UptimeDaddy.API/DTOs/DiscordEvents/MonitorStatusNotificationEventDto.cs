using System.Text.Json.Serialization;

namespace UptimeDaddy.API.DTOs.DiscordEvents
{
    public class MonitorStatusNotificationEventDto
    {
        [JsonPropertyName("eventType")]
        public string EventType { get; set; } = "monitor_status";

        [JsonPropertyName("eventVersion")]
        public int EventVersion { get; set; } = 2;

        [JsonPropertyName("idempotencyKey")]
        public string IdempotencyKey { get; set; } = string.Empty;

        [JsonPropertyName("workspaceId")]
        public long WorkspaceId { get; set; }

        [JsonPropertyName("monitorPathId")]
        public long MonitorPathId { get; set; }

        [JsonPropertyName("monitorId")]
        public long MonitorId { get; set; }

        [JsonPropertyName("websiteId")]
        public long WebsiteId => MonitorPathId;

        [JsonPropertyName("websiteUrl")]
        public string WebsiteUrl { get; set; } = string.Empty;

        [JsonPropertyName("prevStatus")]
        public string PrevStatus { get; set; } = "unknown";

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("statusCode")]
        public int StatusCode { get; set; }

        [JsonPropertyName("occurredAt")]
        public DateTime OccurredAt { get; set; }

        [JsonPropertyName("totalTimeMs")]
        public double TotalTimeMs { get; set; }

        [JsonPropertyName("downtimeDurationMs")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public double? DowntimeDurationMs { get; set; }
    }
}

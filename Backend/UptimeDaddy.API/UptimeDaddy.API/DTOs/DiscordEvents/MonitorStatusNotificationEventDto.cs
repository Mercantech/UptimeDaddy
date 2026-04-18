using System.Text.Json.Serialization;

namespace UptimeDaddy.API.DTOs.DiscordEvents
{
    /// <summary>MQTT topic: uptime/discord/notification_events</summary>
    public class MonitorStatusNotificationEventDto
    {
        [JsonPropertyName("eventType")]
        public string EventType { get; set; } = "monitor_status";

        [JsonPropertyName("eventVersion")]
        public int EventVersion { get; set; } = 1;

        [JsonPropertyName("idempotencyKey")]
        public string IdempotencyKey { get; set; } = string.Empty;

        [JsonPropertyName("workspaceId")]
        public long WorkspaceId { get; set; }

        [JsonPropertyName("websiteId")]
        public long WebsiteId { get; set; }

        [JsonPropertyName("websiteUrl")]
        public string WebsiteUrl { get; set; } = string.Empty;

        /// <summary>unknown | up | down</summary>
        [JsonPropertyName("prevStatus")]
        public string PrevStatus { get; set; } = "unknown";

        /// <summary>up | down</summary>
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("statusCode")]
        public int StatusCode { get; set; }

        [JsonPropertyName("occurredAt")]
        public DateTime OccurredAt { get; set; }

        [JsonPropertyName("totalTimeMs")]
        public double TotalTimeMs { get; set; }
    }
}

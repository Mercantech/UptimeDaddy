using System.Text.Json.Serialization;

namespace UptimeDaddy.API.DTOs.DiscordEvents
{
    public class DiscordReportRequestEventDto
    {
        [JsonPropertyName("eventType")]
        public string EventType { get; set; } = "report_request";

        [JsonPropertyName("eventVersion")]
        public int EventVersion { get; set; } = 2;

        [JsonPropertyName("idempotencyKey")]
        public string IdempotencyKey { get; set; } = string.Empty;

        [JsonPropertyName("workspaceId")]
        public long WorkspaceId { get; set; }

        [JsonPropertyName("reportType")]
        public string ReportType { get; set; } = "summary";

        [JsonPropertyName("scheduleId")]
        public long? ScheduleId { get; set; }

        [JsonPropertyName("monitorIds")]
        public List<long>? MonitorIds { get; set; }

        [JsonPropertyName("websiteIds")]
        public List<long>? WebsiteIds => MonitorIds;

        [JsonPropertyName("requestedAt")]
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    }
}

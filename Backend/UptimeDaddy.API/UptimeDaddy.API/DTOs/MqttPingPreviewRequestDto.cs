namespace UptimeDaddy.API.DTOs
{
    public class MqttPingPreviewRequestDto
    {
        public string Type { get; set; } = "ping_preview";
        public string RequestId { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}

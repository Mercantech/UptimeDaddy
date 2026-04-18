using System.Text.Json.Serialization;

namespace UptimeDaddy.API.DTOs
{
    public class MqttFaviconUpdateDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [JsonPropertyName("user_id")]
        public long UserId { get; set; }

        [JsonPropertyName("favicon")]
        public string Favicon { get; set; } = string.Empty;
    }
}
using System.Text.Json.Serialization;

namespace UptimeDaddy.API.DTOs
{
    public class MqttPingPreviewResponseDto
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = string.Empty;

        [JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("dns_lookup")]
        public double DnsLookup { get; set; }

        [JsonPropertyName("connect_to_page")]
        public double ConnectToPage { get; set; }

        [JsonPropertyName("tls_hand_shake")]
        public double TlsHandShake { get; set; }

        [JsonPropertyName("time_to_first_byte")]
        public double TimeToFirstByte { get; set; }

        [JsonPropertyName("total_time")]
        public double TotalTime { get; set; }
    }
}
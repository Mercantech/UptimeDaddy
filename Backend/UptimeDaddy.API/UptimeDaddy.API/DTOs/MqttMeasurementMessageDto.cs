using System.Text.Json.Serialization;

namespace UptimeDaddy.API.DTOs
{
    public class MqttMeasurementMessageDto
    {
        [JsonPropertyName("pages")]
        public List<MqttPageDto> Pages { get; set; } = new();
    }

    public class MqttPageDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [JsonPropertyName("user_id")]
        public long UserId { get; set; }

        [JsonPropertyName("response")]
        public MqttResponseDto Response { get; set; } = new();
    }

    public class MqttResponseDto
    {
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
using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("measurements")]
    public class Measurement
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("website_id")]
        public long WebsiteId { get; set; }

        [Column("status_code")]
        public int StatusCode { get; set; }

        [Column("dns_lookup_ms")]
        public double DnsLookupMs { get; set; }

        [Column("connect_ms")]
        public double ConnectMs { get; set; }

        [Column("tls_handshake_ms")]
        public double TlsHandshakeMs { get; set; }

        [Column("time_to_first_byte_ms")]
        public double TimeToFirstByteMs { get; set; }

        [Column("total_time_ms")]
        public double TotalTimeMs { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Website? Website { get; set; }
    }
}
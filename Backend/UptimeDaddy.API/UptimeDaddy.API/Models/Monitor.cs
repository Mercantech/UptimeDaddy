using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("monitors")]
    public class Monitor
    {
        [Column("id")]
        public long Id { get; set; }

        [Required]
        [Column("base_url")]
        public string BaseUrl { get; set; } = string.Empty;

        [Column("interval_time")]
        public int IntervalTime { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        public User User { get; set; } = null!;

        public List<MonitorPath> Paths { get; set; } = new();

        public List<DashboardBoardItem> DashboardBoardItems { get; set; } = new();

        [Column("faviconbase64")]
        public string? FaviconBase64 { get; set; }

        [Column("ssl_expires_at")]
        public DateTime? SslExpiresAt { get; set; }
    }
}

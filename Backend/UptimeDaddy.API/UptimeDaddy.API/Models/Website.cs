using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("websites")]
    public class Website
    {
        [Column("id")]
        public long Id { get; set; }

        [Required]
        [Column("url")]
        public string Url { get; set; } = string.Empty;

        [Column("interval_time")]
        public int IntervalTime { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        public User User { get; set; } = null!;

        public List<Measurement> Measurements { get; set; } = new();

        [Column("faviconbase64")]
        public string? FaviconBase64 { get; set; }
    }
}
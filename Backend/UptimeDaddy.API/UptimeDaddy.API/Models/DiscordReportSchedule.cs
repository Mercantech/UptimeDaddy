using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("discord_report_schedules")]
    public class DiscordReportSchedule
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        /// <summary>Null = brug default kanal fra integration.</summary>
        [Column("channel_id")]
        public string? ChannelId { get; set; }

        /// <summary>Cron udtryk (UTC), f.eks. "0 9 * * *" for daglig kl. 09:00 UTC.</summary>
        [Required]
        [Column("cron_expression")]
        public string CronExpression { get; set; } = "0 9 * * *";

        [Required]
        [Column("report_type")]
        public string ReportType { get; set; } = "summary";

        [Column("enabled")]
        public bool Enabled { get; set; } = true;

        [Column("last_run_at")]
        public DateTime? LastRunAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
    }
}

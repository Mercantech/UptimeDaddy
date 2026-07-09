using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("discord_monitor_subscriptions")]
    public class DiscordMonitorSubscription
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("monitor_path_id")]
        public long MonitorPathId { get; set; }

        [Column("notification_enabled")]
        public bool NotificationEnabled { get; set; } = true;

        [Column("channel_id_override")]
        public string? ChannelIdOverride { get; set; }

        public MonitorPath MonitorPath { get; set; } = null!;
    }
}

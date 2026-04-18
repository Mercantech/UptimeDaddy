using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("discord_monitor_subscriptions")]
    public class DiscordMonitorSubscription
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("website_id")]
        public long WebsiteId { get; set; }

        [Column("notification_enabled")]
        public bool NotificationEnabled { get; set; } = true;

        /// <summary>Discord channel snowflake; null bruger workspace default.</summary>
        [Column("channel_id_override")]
        public string? ChannelIdOverride { get; set; }

        public Website Website { get; set; } = null!;
    }
}

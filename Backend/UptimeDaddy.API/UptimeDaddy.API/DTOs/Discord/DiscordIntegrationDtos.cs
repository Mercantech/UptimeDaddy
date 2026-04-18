using System.ComponentModel.DataAnnotations;

namespace UptimeDaddy.API.DTOs.Discord
{
    public class UpsertDiscordIntegrationDto
    {
        [Required]
        public string GuildId { get; set; } = string.Empty;

        [Required]
        public string DefaultChannelId { get; set; } = string.Empty;

        public bool Enabled { get; set; } = true;
    }

    public class UpsertDiscordMonitorSubscriptionDto
    {
        public bool NotificationEnabled { get; set; } = true;

        public string? ChannelIdOverride { get; set; }
    }

    public class CreateDiscordReportScheduleDto
    {
        public string? ChannelId { get; set; }

        [Required]
        public string CronExpression { get; set; } = "0 9 * * *";

        [Required]
        public string ReportType { get; set; } = "summary";

        public bool Enabled { get; set; } = true;
    }

    public class UpdateDiscordReportScheduleDto
    {
        public string? ChannelId { get; set; }

        [Required]
        public string CronExpression { get; set; } = "0 9 * * *";

        [Required]
        public string ReportType { get; set; } = "summary";

        public bool Enabled { get; set; } = true;
    }

    public class TriggerDiscordReportDto
    {
        public string ReportType { get; set; } = "summary";

        public List<long>? WebsiteIds { get; set; }
    }
}

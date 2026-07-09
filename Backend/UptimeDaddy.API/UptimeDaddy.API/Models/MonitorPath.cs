using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("monitor_paths")]
    public class MonitorPath
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("monitor_id")]
        public long MonitorId { get; set; }

        public Monitor Monitor { get; set; } = null!;

        [Column("path")]
        public string Path { get; set; } = "/";

        [Column("display_label")]
        public string? DisplayLabel { get; set; }

        [Column("keyword")]
        public string? Keyword { get; set; }

        [Column("keyword_must_contain")]
        public bool KeywordMustContain { get; set; } = true;

        public List<Measurement> Measurements { get; set; } = new();

        public DiscordMonitorSubscription? DiscordMonitorSubscription { get; set; }

        public MonitorIncidentState? MonitorIncidentState { get; set; }
    }
}

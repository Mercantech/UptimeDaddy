using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("monitor_incident_events")]
    public class MonitorIncidentEvent
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("monitor_path_id")]
        public long MonitorPathId { get; set; }

        public MonitorPath MonitorPath { get; set; } = null!;

        [Column("occurred_at")]
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

        [Column("is_up")]
        public bool IsUp { get; set; }

        [Column("status_code")]
        public int StatusCode { get; set; }

        [Column("total_time_ms")]
        public double TotalTimeMs { get; set; }

        [Column("downtime_duration_ms")]
        public double? DowntimeDurationMs { get; set; }
    }
}

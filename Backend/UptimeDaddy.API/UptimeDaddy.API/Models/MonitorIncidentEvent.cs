using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("monitor_incident_events")]
    public class MonitorIncidentEvent
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("website_id")]
        public long WebsiteId { get; set; }

        public Website Website { get; set; } = null!;

        [Column("occurred_at")]
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

        /// <summary>Status efter overgang: oppe = true (2xx/3xx), nede = false.</summary>
        [Column("is_up")]
        public bool IsUp { get; set; }

        [Column("status_code")]
        public int StatusCode { get; set; }

        [Column("total_time_ms")]
        public double TotalTimeMs { get; set; }

        /// <summary>Ved genoprettelse (is_up): hvor længe sitet var nede i ms siden sidste ned-overgang.</summary>
        [Column("downtime_duration_ms")]
        public double? DowntimeDurationMs { get; set; }
    }
}

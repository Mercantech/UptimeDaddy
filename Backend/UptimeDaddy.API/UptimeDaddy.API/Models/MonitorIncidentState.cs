using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("monitor_incident_states")]
    public class MonitorIncidentState
    {
        [Column("website_id")]
        public long WebsiteId { get; set; }

        [Column("last_is_up")]
        public bool LastIsUp { get; set; }

        [Column("last_status_code")]
        public int LastStatusCode { get; set; }

        [Column("last_transition_at")]
        public DateTime LastTransitionAt { get; set; } = DateTime.UtcNow;

        [Column("last_notification_sent_at")]
        public DateTime? LastNotificationSentAt { get; set; }

        [Column("initialized")]
        public bool Initialized { get; set; }

        public Website Website { get; set; } = null!;
    }
}

using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models;

[Table("email_notification_preferences")]
public class EmailNotificationPreference
{
    [Column("user_id")]
    public long UserId { get; set; }

    [Column("enabled")]
    public bool Enabled { get; set; } = true;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}

namespace UptimeDaddy.API.Options;

public class EmailOptions
{
    public const string SectionName = "Email";

    public bool Enabled { get; set; } = true;
    public string SmtpHost { get; set; } = "smtp-relay.brevo.com";
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUser { get; set; }
    public string? SmtpPassword { get; set; }
    public bool UseStartTls { get; set; } = true;
    public string FromAddress { get; set; } = "noreply@uptimedaddy.mercantec.tech";
    public string FromName { get; set; } = "UptimeDaddy";
    public string? ReplyToAddress { get; set; }
    public int NotificationCooldownSeconds { get; set; } = 60;
}

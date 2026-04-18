using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("accounts")]
    public class User
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [Column("fullName")]
        public string Fullname { get; set; } = string.Empty;

        public List<Website> Websites { get; set; } = new();

        public List<DashboardBoard> DashboardBoards { get; set; } = new();

        public DiscordIntegration? DiscordIntegration { get; set; }

        public List<DiscordReportSchedule> DiscordReportSchedules { get; set; } = new();
    }
}
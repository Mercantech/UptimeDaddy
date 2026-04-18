using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("dashboard_boards")]
    public class DashboardBoard
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        public User User { get; set; } = null!;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("share_token")]
        public string ShareToken { get; set; } = string.Empty;

        [Column("is_published")]
        public bool IsPublished { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<DashboardBoardItem> Items { get; set; } = new();
    }
}

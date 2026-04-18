using System.ComponentModel.DataAnnotations.Schema;

namespace UptimeDaddy.API.Models
{
    [Table("dashboard_board_items")]
    public class DashboardBoardItem
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("dashboard_board_id")]
        public long DashboardBoardId { get; set; }

        public DashboardBoard DashboardBoard { get; set; } = null!;

        [Column("website_id")]
        public long WebsiteId { get; set; }

        public Website Website { get; set; } = null!;

        [Column("sort_order")]
        public int SortOrder { get; set; }

        [Column("display_label")]
        public string? DisplayLabel { get; set; }
    }
}

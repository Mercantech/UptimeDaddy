namespace UptimeDaddy.API.DTOs
{
    public class DashboardBoardItemUpdateDto
    {
        public long WebsiteId { get; set; }
        public int SortOrder { get; set; }
        public string? DisplayLabel { get; set; }
    }
}

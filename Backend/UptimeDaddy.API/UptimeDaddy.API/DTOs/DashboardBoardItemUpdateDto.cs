namespace UptimeDaddy.API.DTOs
{
    public class DashboardBoardItemUpdateDto
    {
        public long MonitorId { get; set; }
        public int SortOrder { get; set; }
        public string? DisplayLabel { get; set; }
    }
}

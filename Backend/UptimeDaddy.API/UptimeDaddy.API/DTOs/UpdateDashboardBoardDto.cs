namespace UptimeDaddy.API.DTOs
{
    public class UpdateDashboardBoardDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsPublished { get; set; }
        public List<DashboardBoardItemUpdateDto> Items { get; set; } = new();
    }
}

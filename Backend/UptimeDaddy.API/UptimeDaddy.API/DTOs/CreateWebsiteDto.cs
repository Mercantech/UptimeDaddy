namespace UptimeDaddy.API.DTOs
{
    public class CreateWebsiteDto
    {
        public string Url { get; set; } = string.Empty;
        public int IntervalTime { get; set; } = 60;
    }
}
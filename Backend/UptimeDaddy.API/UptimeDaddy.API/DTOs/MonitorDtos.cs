namespace UptimeDaddy.API.DTOs
{
    public class CreateMonitorPathDto
    {
        public string Path { get; set; } = "/";
        public string? DisplayLabel { get; set; }
        public string? Keyword { get; set; }
        public bool KeywordMustContain { get; set; } = true;
    }

    public class CreateMonitorDto
    {
        public string BaseUrl { get; set; } = string.Empty;
        public int IntervalTime { get; set; } = 60;
        public List<CreateMonitorPathDto> Paths { get; set; } = new();
    }

    public class UpdateMonitorIntervalDto
    {
        public int IntervalTime { get; set; }
    }

    public class AddMonitorPathDto
    {
        public string Path { get; set; } = "/";
        public string? DisplayLabel { get; set; }
        public string? Keyword { get; set; }
        public bool KeywordMustContain { get; set; } = true;
    }

    public class UpdateMonitorPathDto
    {
        public string? DisplayLabel { get; set; }
        public string? Keyword { get; set; }
        public bool? KeywordMustContain { get; set; }
    }
}

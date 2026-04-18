namespace UptimeDaddy.API.DTOs
{
    public class CreateMeasurementDto
    {
        public int WebsiteId { get; set; }
        public int StatusCode { get; set; }

        public double DnsLookupMs { get; set; }
        public double ConnectMs { get; set; }
        public double TlsHandshakeMs { get; set; }
        public double TimeToFirstByteMs { get; set; }
        public double TotalTimeMs { get; set; }
    }
}

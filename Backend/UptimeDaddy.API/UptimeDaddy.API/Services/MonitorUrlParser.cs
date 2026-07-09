namespace UptimeDaddy.API.Services
{
    public static class MonitorUrlParser
    {
        public static (string BaseUrl, string Path) Parse(string input)
        {
            var raw = input.Trim();
            if (string.IsNullOrWhiteSpace(raw))
                return (string.Empty, "/");

            var withScheme = raw;
            if (!withScheme.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !withScheme.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                withScheme = "https://" + withScheme;
            }

            if (!Uri.TryCreate(withScheme, UriKind.Absolute, out var uri))
            {
                var slash = raw.IndexOf('/');
                if (slash < 0)
                    return (raw.ToLowerInvariant(), "/");
                return (raw[..slash].ToLowerInvariant(), raw[slash..]);
            }

            var host = uri.Host;
            if (!uri.IsDefaultPort)
                host += ":" + uri.Port;

            var path = uri.PathAndQuery;
            if (string.IsNullOrEmpty(path))
                path = "/";
            if (!string.IsNullOrEmpty(uri.Fragment))
                path += uri.Fragment;

            return (host.ToLowerInvariant(), path);
        }

        public static string BuildFullUrl(string baseUrl, string path)
        {
            var normalizedPath = string.IsNullOrWhiteSpace(path) || path == "/"
                ? ""
                : (path.StartsWith('/') ? path : "/" + path);
            return "https://" + baseUrl.Trim().TrimEnd('/') + normalizedPath;
        }

        public static string DisplayUrl(string baseUrl, string path)
        {
            if (string.IsNullOrWhiteSpace(path) || path == "/")
                return baseUrl;
            return baseUrl + (path.StartsWith('/') ? path : "/" + path);
        }
    }
}

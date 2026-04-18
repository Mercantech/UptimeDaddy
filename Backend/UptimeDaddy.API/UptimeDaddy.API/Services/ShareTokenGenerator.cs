using System.Security.Cryptography;

namespace UptimeDaddy.API.Services
{
    public static class ShareTokenGenerator
    {
        /// <summary>URL-sikkert token (ca. 43 tegn).</summary>
        public static string CreateToken()
        {
            var bytes = new byte[32];
            RandomNumberGenerator.Fill(bytes);
            return Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }
    }
}

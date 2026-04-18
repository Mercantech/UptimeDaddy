using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace UptimeDaddy.API.Data
{
    public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var basePath = Directory.GetCurrentDirectory();

            // Gå 2 mapper op for at finde .env
            var envPath = Path.GetFullPath(Path.Combine(basePath, "..", "..", ".env"));

            if (File.Exists(envPath))
            {
                Env.Load(envPath);
            }
            else
            {
                Console.WriteLine($"⚠️ .env not found at: {envPath}");
            }

            var configuration = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddEnvironmentVariables()
                .Build();

            var connectionString = configuration.GetConnectionString("DefaultConnection");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "Connection string 'DefaultConnection' was not found in .env.");
            }

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
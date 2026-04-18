using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Website> Websites { get; set; }
        public DbSet<Measurement> Measurements { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasMany(u => u.Websites)
                .WithOne(w => w.User)
                .HasForeignKey(w => w.UserId);

            modelBuilder.Entity<Website>()
                .HasMany(w => w.Measurements)
                .WithOne(m => m.Website)
                .HasForeignKey(m => m.WebsiteId);

            modelBuilder.Entity<Website>()
                .HasIndex(w => w.UserId)
                .HasDatabaseName("ix_websites_user_id");

            modelBuilder.Entity<Measurement>()
                .HasIndex(m => new { m.WebsiteId, m.CreatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("ix_measurements_website_id_created_at_desc");
        }
    }
}
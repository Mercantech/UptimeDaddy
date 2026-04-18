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
        public DbSet<DashboardBoard> DashboardBoards { get; set; }
        public DbSet<DashboardBoardItem> DashboardBoardItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasMany(u => u.Websites)
                .WithOne(w => w.User)
                .HasForeignKey(w => w.UserId);

            modelBuilder.Entity<User>()
                .HasMany(u => u.DashboardBoards)
                .WithOne(b => b.User)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DashboardBoard>()
                .HasMany(b => b.Items)
                .WithOne(i => i.DashboardBoard)
                .HasForeignKey(i => i.DashboardBoardId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DashboardBoard>()
                .HasIndex(b => b.ShareToken)
                .IsUnique()
                .HasDatabaseName("ix_dashboard_boards_share_token");

            modelBuilder.Entity<DashboardBoard>()
                .HasIndex(b => b.UserId)
                .HasDatabaseName("ix_dashboard_boards_user_id");

            modelBuilder.Entity<DashboardBoard>()
                .HasIndex(b => new { b.UserId, b.Name })
                .IsUnique()
                .HasDatabaseName("ix_dashboard_boards_user_id_name_unique");

            modelBuilder.Entity<DashboardBoardItem>()
                .HasIndex(i => new { i.DashboardBoardId, i.SortOrder })
                .HasDatabaseName("ix_dashboard_board_items_board_sort");

            modelBuilder.Entity<Website>()
                .HasMany(w => w.Measurements)
                .WithOne(m => m.Website)
                .HasForeignKey(m => m.WebsiteId);

            modelBuilder.Entity<Website>()
                .HasMany(w => w.DashboardBoardItems)
                .WithOne(i => i.Website)
                .HasForeignKey(i => i.WebsiteId)
                .OnDelete(DeleteBehavior.Cascade);

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
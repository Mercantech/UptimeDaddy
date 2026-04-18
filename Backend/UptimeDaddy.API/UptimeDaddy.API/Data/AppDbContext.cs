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
        public DbSet<DiscordIntegration> DiscordIntegrations { get; set; }
        public DbSet<DiscordMonitorSubscription> DiscordMonitorSubscriptions { get; set; }
        public DbSet<DiscordReportSchedule> DiscordReportSchedules { get; set; }
        public DbSet<MonitorIncidentState> MonitorIncidentStates { get; set; }

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

            // Ét publiceret board pr. offentligt ID (navn), så /b/{id} er entydigt.
            modelBuilder.Entity<DashboardBoard>()
                .HasIndex(b => b.Name)
                .IsUnique()
                .HasDatabaseName("ix_dashboard_boards_name_published_unique")
                .HasFilter("is_published = TRUE");

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

            modelBuilder.Entity<DiscordIntegration>()
                .HasOne(i => i.User)
                .WithOne(u => u.DiscordIntegration)
                .HasForeignKey<DiscordIntegration>(i => i.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DiscordIntegration>()
                .HasIndex(i => i.UserId)
                .IsUnique()
                .HasDatabaseName("ix_discord_integrations_user_id_unique");

            modelBuilder.Entity<DiscordMonitorSubscription>()
                .HasOne(s => s.Website)
                .WithOne(w => w.DiscordMonitorSubscription)
                .HasForeignKey<DiscordMonitorSubscription>(s => s.WebsiteId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DiscordMonitorSubscription>()
                .HasIndex(s => s.WebsiteId)
                .IsUnique()
                .HasDatabaseName("ix_discord_monitor_subscriptions_website_id_unique");

            modelBuilder.Entity<DiscordReportSchedule>()
                .HasOne(s => s.User)
                .WithMany(u => u.DiscordReportSchedules)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DiscordReportSchedule>()
                .HasIndex(s => s.UserId)
                .HasDatabaseName("ix_discord_report_schedules_user_id");

            modelBuilder.Entity<MonitorIncidentState>()
                .HasOne(s => s.Website)
                .WithOne(w => w.MonitorIncidentState)
                .HasForeignKey<MonitorIncidentState>(s => s.WebsiteId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MonitorIncidentState>()
                .HasKey(s => s.WebsiteId);
        }
    }
}
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
        public DbSet<Monitor> Monitors { get; set; }
        public DbSet<MonitorPath> MonitorPaths { get; set; }
        public DbSet<Measurement> Measurements { get; set; }
        public DbSet<DashboardBoard> DashboardBoards { get; set; }
        public DbSet<DashboardBoardItem> DashboardBoardItems { get; set; }
        public DbSet<DiscordIntegration> DiscordIntegrations { get; set; }
        public DbSet<DiscordMonitorSubscription> DiscordMonitorSubscriptions { get; set; }
        public DbSet<DiscordReportSchedule> DiscordReportSchedules { get; set; }
        public DbSet<MonitorIncidentState> MonitorIncidentStates { get; set; }
        public DbSet<MonitorIncidentEvent> MonitorIncidentEvents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasMany(u => u.Monitors)
                .WithOne(m => m.User)
                .HasForeignKey(m => m.UserId);

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

            modelBuilder.Entity<DashboardBoard>()
                .HasIndex(b => b.Name)
                .IsUnique()
                .HasDatabaseName("ix_dashboard_boards_name_published_unique")
                .HasFilter("is_published = TRUE");

            modelBuilder.Entity<DashboardBoardItem>()
                .HasIndex(i => new { i.DashboardBoardId, i.SortOrder })
                .HasDatabaseName("ix_dashboard_board_items_board_sort");

            modelBuilder.Entity<Monitor>()
                .HasMany(m => m.Paths)
                .WithOne(p => p.Monitor)
                .HasForeignKey(p => p.MonitorId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Monitor>()
                .HasMany(m => m.DashboardBoardItems)
                .WithOne(i => i.Monitor)
                .HasForeignKey(i => i.MonitorId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Monitor>()
                .HasIndex(m => m.UserId)
                .HasDatabaseName("ix_monitors_user_id");

            modelBuilder.Entity<Monitor>()
                .HasIndex(m => new { m.UserId, m.BaseUrl })
                .IsUnique()
                .HasDatabaseName("ix_monitors_user_id_base_url_unique");

            modelBuilder.Entity<MonitorPath>()
                .HasIndex(p => new { p.MonitorId, p.Path })
                .IsUnique()
                .HasDatabaseName("ix_monitor_paths_monitor_id_path_unique");

            modelBuilder.Entity<MonitorPath>()
                .HasMany(p => p.Measurements)
                .WithOne(m => m.MonitorPath)
                .HasForeignKey(m => m.MonitorPathId);

            modelBuilder.Entity<Measurement>()
                .HasIndex(m => new { m.MonitorPathId, m.CreatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("ix_measurements_monitor_path_id_created_at_desc");

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
                .HasOne(s => s.MonitorPath)
                .WithOne(p => p.DiscordMonitorSubscription)
                .HasForeignKey<DiscordMonitorSubscription>(s => s.MonitorPathId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DiscordMonitorSubscription>()
                .HasIndex(s => s.MonitorPathId)
                .IsUnique()
                .HasDatabaseName("ix_discord_monitor_subscriptions_monitor_path_id_unique");

            modelBuilder.Entity<DiscordReportSchedule>()
                .HasOne(s => s.User)
                .WithMany(u => u.DiscordReportSchedules)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DiscordReportSchedule>()
                .HasIndex(s => s.UserId)
                .HasDatabaseName("ix_discord_report_schedules_user_id");

            modelBuilder.Entity<MonitorIncidentState>()
                .HasOne(s => s.MonitorPath)
                .WithOne(p => p.MonitorIncidentState)
                .HasForeignKey<MonitorIncidentState>(s => s.MonitorPathId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MonitorIncidentState>()
                .HasKey(s => s.MonitorPathId);

            modelBuilder.Entity<MonitorIncidentEvent>()
                .HasOne(e => e.MonitorPath)
                .WithMany()
                .HasForeignKey(e => e.MonitorPathId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MonitorIncidentEvent>()
                .HasIndex(e => new { e.MonitorPathId, e.OccurredAt })
                .IsDescending(false, true)
                .HasDatabaseName("ix_monitor_incident_events_path_occurred_desc");
        }
    }
}

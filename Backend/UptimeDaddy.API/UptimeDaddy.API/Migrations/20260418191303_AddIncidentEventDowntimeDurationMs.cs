using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UptimeDaddy.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentEventDowntimeDurationMs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "downtime_duration_ms",
                table: "monitor_incident_events",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "downtime_duration_ms",
                table: "monitor_incident_events");
        }
    }
}

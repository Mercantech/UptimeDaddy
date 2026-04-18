using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UptimeDaddy.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscordIntegrationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "discord_integrations",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    guild_id = table.Column<string>(type: "text", nullable: false),
                    default_channel_id = table.Column<string>(type: "text", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discord_integrations", x => x.id);
                    table.ForeignKey(
                        name: "FK_discord_integrations_accounts_user_id",
                        column: x => x.user_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "discord_monitor_subscriptions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    website_id = table.Column<long>(type: "bigint", nullable: false),
                    notification_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    channel_id_override = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discord_monitor_subscriptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_discord_monitor_subscriptions_websites_website_id",
                        column: x => x.website_id,
                        principalTable: "websites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "discord_report_schedules",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    channel_id = table.Column<string>(type: "text", nullable: true),
                    cron_expression = table.Column<string>(type: "text", nullable: false),
                    report_type = table.Column<string>(type: "text", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    last_run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discord_report_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_discord_report_schedules_accounts_user_id",
                        column: x => x.user_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "monitor_incident_states",
                columns: table => new
                {
                    website_id = table.Column<long>(type: "bigint", nullable: false),
                    last_is_up = table.Column<bool>(type: "boolean", nullable: false),
                    last_status_code = table.Column<int>(type: "integer", nullable: false),
                    last_transition_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_notification_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    initialized = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_monitor_incident_states", x => x.website_id);
                    table.ForeignKey(
                        name: "FK_monitor_incident_states_websites_website_id",
                        column: x => x.website_id,
                        principalTable: "websites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_discord_integrations_user_id_unique",
                table: "discord_integrations",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_discord_monitor_subscriptions_website_id_unique",
                table: "discord_monitor_subscriptions",
                column: "website_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_discord_report_schedules_user_id",
                table: "discord_report_schedules",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "discord_integrations");

            migrationBuilder.DropTable(
                name: "discord_monitor_subscriptions");

            migrationBuilder.DropTable(
                name: "discord_report_schedules");

            migrationBuilder.DropTable(
                name: "monitor_incident_states");
        }
    }
}

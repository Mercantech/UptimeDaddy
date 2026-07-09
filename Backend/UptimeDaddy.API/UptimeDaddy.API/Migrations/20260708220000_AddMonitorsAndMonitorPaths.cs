using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UptimeDaddy.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMonitorsAndMonitorPaths : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "monitors",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    base_url = table.Column<string>(type: "text", nullable: false),
                    interval_time = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    faviconbase64 = table.Column<string>(type: "text", nullable: true),
                    ssl_expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_monitors", x => x.id);
                    table.ForeignKey(
                        name: "FK_monitors_accounts_user_id",
                        column: x => x.user_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "monitor_paths",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    monitor_id = table.Column<long>(type: "bigint", nullable: false),
                    path = table.Column<string>(type: "text", nullable: false),
                    display_label = table.Column<string>(type: "text", nullable: true),
                    keyword = table.Column<string>(type: "text", nullable: true),
                    keyword_must_contain = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_monitor_paths", x => x.id);
                    table.ForeignKey(
                        name: "FK_monitor_paths_monitors_monitor_id",
                        column: x => x.monitor_id,
                        principalTable: "monitors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_monitors_user_id",
                table: "monitors",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_monitors_user_id_base_url_unique",
                table: "monitors",
                columns: new[] { "user_id", "base_url" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_monitor_paths_monitor_id_path_unique",
                table: "monitor_paths",
                columns: new[] { "monitor_id", "path" },
                unique: true);

            migrationBuilder.Sql(@"
CREATE TEMP TABLE website_migration_map (
    website_id bigint PRIMARY KEY,
    monitor_id bigint NOT NULL,
    monitor_path_id bigint NOT NULL
);

CREATE OR REPLACE FUNCTION pg_temp.parse_uptime_url(raw_url text)
RETURNS TABLE(base_url text, path text) AS $$
DECLARE
    u text;
    slash_pos int;
BEGIN
    u := trim(raw_url);
    IF u ~* '^https?://' THEN
        u := regexp_replace(u, '^https?://', '', 'i');
    END IF;
    slash_pos := position('/' in u);
    IF slash_pos = 0 THEN
        base_url := lower(u);
        path := '/';
    ELSE
        base_url := lower(substring(u from 1 for slash_pos - 1));
        path := substring(u from slash_pos);
        IF path = '' THEN path := '/'; END IF;
    END IF;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

INSERT INTO monitors (base_url, interval_time, user_id, faviconbase64)
SELECT DISTINCT ON (w.user_id, p.base_url)
    p.base_url,
    w.interval_time,
    w.user_id,
    w.faviconbase64
FROM websites w
CROSS JOIN LATERAL pg_temp.parse_uptime_url(w.url) AS p(base_url, path)
ORDER BY w.user_id, p.base_url, w.id;

INSERT INTO monitor_paths (monitor_id, path)
SELECT m.id, p.path
FROM websites w
CROSS JOIN LATERAL pg_temp.parse_uptime_url(w.url) AS p(base_url, path)
JOIN monitors m ON m.user_id = w.user_id AND m.base_url = p.base_url;

INSERT INTO website_migration_map (website_id, monitor_id, monitor_path_id)
SELECT w.id, m.id, mp.id
FROM websites w
CROSS JOIN LATERAL pg_temp.parse_uptime_url(w.url) AS p(base_url, path)
JOIN monitors m ON m.user_id = w.user_id AND m.base_url = p.base_url
JOIN monitor_paths mp ON mp.monitor_id = m.id AND mp.path = p.path;
");

            migrationBuilder.AddColumn<long>(
                name: "monitor_path_id",
                table: "measurements",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "keyword_matched",
                table: "measurements",
                type: "boolean",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE measurements m
SET monitor_path_id = map.monitor_path_id
FROM website_migration_map map
WHERE m.website_id = map.website_id;
");

            migrationBuilder.DropForeignKey(
                name: "FK_measurements_websites_website_id",
                table: "measurements");

            migrationBuilder.DropIndex(
                name: "ix_measurements_website_id_created_at_desc",
                table: "measurements");

            migrationBuilder.DropColumn(
                name: "website_id",
                table: "measurements");

            migrationBuilder.AlterColumn<long>(
                name: "monitor_path_id",
                table: "measurements",
                type: "bigint",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "ix_measurements_monitor_path_id_created_at_desc",
                table: "measurements",
                columns: new[] { "monitor_path_id", "created_at" },
                descending: new[] { false, true });

            migrationBuilder.AddForeignKey(
                name: "FK_measurements_monitor_paths_monitor_path_id",
                table: "measurements",
                column: "monitor_path_id",
                principalTable: "monitor_paths",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddColumn<long>(
                name: "monitor_path_id",
                table: "monitor_incident_states",
                type: "bigint",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE monitor_incident_states s
SET monitor_path_id = map.monitor_path_id
FROM website_migration_map map
WHERE s.website_id = map.website_id;
");

            migrationBuilder.DropPrimaryKey(
                name: "PK_monitor_incident_states",
                table: "monitor_incident_states");

            migrationBuilder.DropForeignKey(
                name: "FK_monitor_incident_states_websites_website_id",
                table: "monitor_incident_states");

            migrationBuilder.DropColumn(
                name: "website_id",
                table: "monitor_incident_states");

            migrationBuilder.AlterColumn<long>(
                name: "monitor_path_id",
                table: "monitor_incident_states",
                type: "bigint",
                nullable: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_monitor_incident_states",
                table: "monitor_incident_states",
                column: "monitor_path_id");

            migrationBuilder.AddForeignKey(
                name: "FK_monitor_incident_states_monitor_paths_monitor_path_id",
                table: "monitor_incident_states",
                column: "monitor_path_id",
                principalTable: "monitor_paths",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddColumn<long>(
                name: "monitor_path_id",
                table: "monitor_incident_events",
                type: "bigint",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE monitor_incident_events e
SET monitor_path_id = map.monitor_path_id
FROM website_migration_map map
WHERE e.website_id = map.website_id;
");

            migrationBuilder.DropForeignKey(
                name: "FK_monitor_incident_events_websites_website_id",
                table: "monitor_incident_events");

            migrationBuilder.DropIndex(
                name: "ix_monitor_incident_events_website_occurred_desc",
                table: "monitor_incident_events");

            migrationBuilder.DropColumn(
                name: "website_id",
                table: "monitor_incident_events");

            migrationBuilder.AlterColumn<long>(
                name: "monitor_path_id",
                table: "monitor_incident_events",
                type: "bigint",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "ix_monitor_incident_events_path_occurred_desc",
                table: "monitor_incident_events",
                columns: new[] { "monitor_path_id", "occurred_at" },
                descending: new[] { false, true });

            migrationBuilder.AddForeignKey(
                name: "FK_monitor_incident_events_monitor_paths_monitor_path_id",
                table: "monitor_incident_events",
                column: "monitor_path_id",
                principalTable: "monitor_paths",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddColumn<long>(
                name: "monitor_path_id",
                table: "discord_monitor_subscriptions",
                type: "bigint",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE discord_monitor_subscriptions s
SET monitor_path_id = map.monitor_path_id
FROM website_migration_map map
WHERE s.website_id = map.website_id;
");

            migrationBuilder.DropForeignKey(
                name: "FK_discord_monitor_subscriptions_websites_website_id",
                table: "discord_monitor_subscriptions");

            migrationBuilder.DropIndex(
                name: "ix_discord_monitor_subscriptions_website_id_unique",
                table: "discord_monitor_subscriptions");

            migrationBuilder.DropColumn(
                name: "website_id",
                table: "discord_monitor_subscriptions");

            migrationBuilder.AlterColumn<long>(
                name: "monitor_path_id",
                table: "discord_monitor_subscriptions",
                type: "bigint",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "ix_discord_monitor_subscriptions_monitor_path_id_unique",
                table: "discord_monitor_subscriptions",
                column: "monitor_path_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_discord_monitor_subscriptions_monitor_paths_monitor_path_id",
                table: "discord_monitor_subscriptions",
                column: "monitor_path_id",
                principalTable: "monitor_paths",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddColumn<long>(
                name: "monitor_id",
                table: "dashboard_board_items",
                type: "bigint",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE dashboard_board_items i
SET monitor_id = map.monitor_id
FROM website_migration_map map
WHERE i.website_id = map.website_id;
");

            migrationBuilder.DropForeignKey(
                name: "FK_dashboard_board_items_websites_website_id",
                table: "dashboard_board_items");

            migrationBuilder.DropIndex(
                name: "IX_dashboard_board_items_website_id",
                table: "dashboard_board_items");

            migrationBuilder.DropColumn(
                name: "website_id",
                table: "dashboard_board_items");

            migrationBuilder.AlterColumn<long>(
                name: "monitor_id",
                table: "dashboard_board_items",
                type: "bigint",
                nullable: false);

            migrationBuilder.AddForeignKey(
                name: "FK_dashboard_board_items_monitors_monitor_id",
                table: "dashboard_board_items",
                column: "monitor_id",
                principalTable: "monitors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.DropTable(
                name: "websites");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("Down migration not supported for AddMonitorsAndMonitorPaths.");
        }
    }
}

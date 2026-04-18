using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UptimeDaddy.API.Migrations
{
    public partial class AddWebsiteAndMeasurementIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "websites",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    url = table.Column<string>(type: "text", nullable: false),
                    interval_time = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    faviconbase64 = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_websites", x => x.id);
                    table.ForeignKey(
                        name: "FK_websites_accounts_user_id",
                        column: x => x.user_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "measurements",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    website_id = table.Column<long>(type: "bigint", nullable: false),
                    status_code = table.Column<int>(type: "integer", nullable: false),
                    dns_lookup_ms = table.Column<double>(type: "double precision", nullable: false),
                    connect_ms = table.Column<double>(type: "double precision", nullable: false),
                    tls_handshake_ms = table.Column<double>(type: "double precision", nullable: false),
                    time_to_first_byte_ms = table.Column<double>(type: "double precision", nullable: false),
                    total_time_ms = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_measurements", x => x.id);
                    table.ForeignKey(
                        name: "FK_measurements_websites_website_id",
                        column: x => x.website_id,
                        principalTable: "websites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_websites_user_id",
                table: "websites",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_measurements_website_id_created_at_desc",
                table: "measurements",
                columns: new[] { "website_id", "created_at" },
                descending: new[] { false, true });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_measurements_website_id_created_at_desc",
                table: "measurements");

            migrationBuilder.DropIndex(
                name: "ix_websites_user_id",
                table: "websites");

            migrationBuilder.DropTable(name: "measurements");

            migrationBuilder.DropTable(name: "websites");
        }
    }
}

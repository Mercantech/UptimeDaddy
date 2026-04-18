using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UptimeDaddy.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDashboardBoards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dashboard_boards",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    share_token = table.Column<string>(type: "text", nullable: false),
                    is_published = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dashboard_boards", x => x.id);
                    table.ForeignKey(
                        name: "FK_dashboard_boards_accounts_user_id",
                        column: x => x.user_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dashboard_board_items",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dashboard_board_id = table.Column<long>(type: "bigint", nullable: false),
                    website_id = table.Column<long>(type: "bigint", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    display_label = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dashboard_board_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_dashboard_board_items_dashboard_boards_dashboard_board_id",
                        column: x => x.dashboard_board_id,
                        principalTable: "dashboard_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dashboard_board_items_websites_website_id",
                        column: x => x.website_id,
                        principalTable: "websites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_dashboard_board_items_website_id",
                table: "dashboard_board_items",
                column: "website_id");

            migrationBuilder.CreateIndex(
                name: "ix_dashboard_board_items_board_sort",
                table: "dashboard_board_items",
                columns: new[] { "dashboard_board_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_dashboard_boards_share_token",
                table: "dashboard_boards",
                column: "share_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_dashboard_boards_user_id",
                table: "dashboard_boards",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "dashboard_board_items");

            migrationBuilder.DropTable(name: "dashboard_boards");
        }
    }
}

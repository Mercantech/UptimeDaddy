using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UptimeDaddy.API.Migrations
{
    /// <inheritdoc />
    public partial class PublishedBoardNameGloballyUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_dashboard_boards_name_published_unique",
                table: "dashboard_boards",
                column: "name",
                unique: true,
                filter: "is_published = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_dashboard_boards_name_published_unique",
                table: "dashboard_boards");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UptimeDaddy.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailNotificationPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "email_notification_preferences",
                columns: table => new
                {
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_email_notification_preferences", x => x.user_id);
                    table.ForeignKey(
                        name: "FK_email_notification_preferences_accounts_user_id",
                        column: x => x.user_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "email_notification_preferences");
        }
    }
}

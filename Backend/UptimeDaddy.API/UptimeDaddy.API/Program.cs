using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.HealthChecks;
using UptimeDaddy.API.Services;
using HealthChecks.UI;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Application services
builder.Services.AddSingleton<IMqttPublishService, MqttPublishService>();
builder.Services.AddSingleton<PingPreviewService>();
builder.Services.AddHostedService<MqttService>();

// Health checks (database + MQTT)
builder.Services.AddSingleton<MqttHealthCheck>();
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>(
        "database",
        HealthStatus.Unhealthy,
        new[] { "db" },
        async (db, ct) =>
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(3));
            try
            {
                return await db.Database.CanConnectAsync(cts.Token);
            }
            catch
            {
                return false;
            }
        }
    )
    .AddCheck<MqttHealthCheck>("mqtt", tags: new[] { "mqtt" });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://10.133.51.121:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// JWT authentication
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new Exception("Jwt:Key is missing");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            ),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"JWT auth failed: {context.Exception}");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.WriteLine("JWT token validated successfully.");
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                Console.WriteLine($"JWT challenge: {context.Error} | {context.ErrorDescription}");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Prometheus metrics middleware (prometheus-net)
app.UseHttpMetrics();

// Health endpoints
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => true,
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/database", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("db"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/mqtt", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("mqtt"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

// HealthChecks UI dashboard (default UI path: /healthchecks-ui)
app.MapHealthChecksUI();

// Prometheus scrape endpoint (default: /metrics)
app.MapMetrics();

app.MapControllers();

app.Run();
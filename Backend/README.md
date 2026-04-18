# UptimeDaddy.API

This is theUptimeDaddy backend service for monitoring website uptime and performance. This repository contains the .NET 10 Web API that stores websites, measurements, and communicates with worker devices via MQTT.

Features
- JWT authentication (token validation configured in Program.cs)
- MQTT publish/subscribe for sending scan requests and receiving measurements
- EF Core with PostgreSQL for production and InMemory provider for tests
- Swagger/OpenAPI with Bearer auth configured

Getting started (local)
1. Set up environment variables (example `.env` or environment):
   - `Jwt__Key` - secret used to validate JWT tokens
   - `ConnectionStrings__DefaultConnection` - PostgreSQL connection string
   - `Mqtt__Host` and `Mqtt__Port` for MQTT broker

2. Run locally:
   - `dotnet build`
   - `dotnet run --project UptimeDaddy.API` or run from Visual Studio

Running tests
- There is a test project `UptimeDaddy.API.Tests` (xUnit). Run:
  - `dotnet test UptimeDaddy.API.Tests\UptimeDaddy.API.Tests.csproj`

API docs
- Swagger UI is available at `/swagger` when running the app locally.

Development notes
- To add a migration: `dotnet ef migrations add NAME --project UptimeDaddy.API --startup-project UptimeDaddy.API`
- To update database: `dotnet ef database update --project UptimeDaddy.API --startup-project UptimeDaddy.API`

## Full stack: `docker-compose.yml` in the repository root

The root [docker-compose.yml](../docker-compose.yml) brings up PostgreSQL, MQTT (Mosquitto), the .NET API, Go auth service (`service-account`), the Ruby HTTP worker, and the React frontend.

**First-time database setup**

On startup the API runs `Database.Migrate()` so `websites` / `measurements` (and pending EF migrations) are applied automatically. The Go `service-account` service should start first so the `accounts` table exists (Docker Compose enforces this). For a **manual** migration from your machine (optional), after copying [.env.example](../.env.example) to `.env` at the repo root:

1. Start Postgres (or the full stack): `docker compose up -d postgres`
2. From `Backend/UptimeDaddy.API`, apply migrations to the Postgres instance reachable on `localhost`. The compose file publishes Postgres on **`POSTGRES_PUBLISH_PORT`** (default **35432** on the host to avoid conflicting with another PostgreSQL on 5432). Adjust `Port=` if you override `POSTGRES_PUBLISH_PORT` in `.env`:

   ```
   dotnet ef database update --project UptimeDaddy.API --startup-project UptimeDaddy.API --connection "Host=localhost;Port=35432;Database=uptimedaddy;Username=uptimedaddy;Password=YOUR_POSTGRES_PASSWORD"
   ```

   Use the same password as `POSTGRES_PASSWORD` in `.env`.

3. Bring everything up: `docker compose up --build` (from the repository root).

The Go service runs `AutoMigrate` for the `accounts` table when it starts. Create an admin user (matching `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`) via `POST /accounts/register` so the Ruby worker can log in and load websites from the API.

### Discord rapport- og notifikationscenter (hybrid)

- **.NET API** gemmer Discord-indstillinger i PostgreSQL, detekterer status-skift på målinger og publicerer events på MQTT (`uptime/discord/*`).
- **`discord-worker` (Go)** i `docker-compose.yml` læser samme database, abonnerer MQTT, sender beskeder via Discord API, og kører planlagte rapporter (cron i `discord_report_schedules`).
- Sæt `DISCORD_BOT_TOKEN` i `.env` og inviter botten med både **`bot`** og **`applications.commands`** (ellers virker `/`-kommandoer ikke). Eksempel-URL (erstat `APPLICATION_ID` med bot/app-id fra Discord Developer Portal):  
  `https://discord.com/api/oauth2/authorize?client_id=APPLICATION_ID&permissions=3072&scope=bot%20applications.commands`  
  (`3072` = se kanal + sende beskeder; udvid efter behov.)
- Worker’en åbner **Gateway** (`Session.Open`), så botten er **online**, og den registrerer slash-kommandoerne **`/udm-rapport`** og **`/udm-hjaelp`**. Rapport-kommandoen poster i den **standardkanal**, I har gemt i integrationen (samme som MQTT-rapporter).
- Valgfrit: sæt `DISCORD_SLASH_GUILD_ID` i `.env` for at registrere kommandoer kun på én server med det samme (ellers **global** registrering med kort forsinkelse).
- API-reference: [docs/api.md](UptimeDaddy.API/docs/api.md) (sektion *Discord*).

### Troubleshooting: `password authentication failed` (28P01) or Ruby `name resolution` for `service-account`

PostgreSQL in Docker only applies `POSTGRES_PASSWORD` when the **data volume is first created**. If you change `.env` later, the cluster still has the old password, so **Go exits** and containers may not register the `service-account` DNS name — the Ruby worker then reports `getaddrinfo: Temporary failure in name resolution`.

Fix: align the real Postgres role password with `.env` (see [.env.example](../.env.example) for `ALTER USER` / `docker compose down -v`), then rebuild and start again.

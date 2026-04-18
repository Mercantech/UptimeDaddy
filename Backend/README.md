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

The API container does **not** run EF migrations on startup. After copying [.env.example](../.env.example) to `.env` at the repo root:

1. Start Postgres (or the full stack): `docker compose up -d postgres`
2. From `Backend/UptimeDaddy.API`, apply migrations to the Postgres instance mapped on `localhost:5432`:

   ```
   dotnet ef database update --project UptimeDaddy.API --startup-project UptimeDaddy.API --connection "Host=localhost;Port=5432;Database=uptimedaddy;Username=uptimedaddy;Password=YOUR_POSTGRES_PASSWORD"
   ```

   Use the same password as `POSTGRES_PASSWORD` in `.env`.

3. Bring everything up: `docker compose up --build` (from the repository root).

The Go service runs `AutoMigrate` for the `accounts` table when it starts. Create an admin user (matching `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`) via `POST /accounts/register` so the Ruby worker can log in and load websites from the API.

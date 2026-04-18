# HTTP Requester

A lightweight monitoring service that fetches targets from an API, performs periodic HTTP requests, and reports results via MQTT.

---

## 🚀 Overview

**HTTP Requester** is a background service designed to:

- Retrieve a list of websites (targets) from an external API  
- Perform HTTP requests to those targets at defined intervals  
- Send the results back to a backend system using MQTT  
- Dynamically update its configuration by listening to incoming MQTT messages

---

## ⚙️ How It Works

1. The service fetches a list of targets from an API  
2. Each target includes:
   - URL  
   - Request interval  
3. The service periodically sends HTTP requests to each target  
4. Results are published as MQTT messages  
5. The service listens for incoming MQTT messages to:
   - Add/remove targets  
   - Change configuration in real-time  
---

## 📡 MQTT Communication

### Publish

The service publishes request results:

- Status codes  
- Response times 
- favicons 

### Subscribe

The service listens for updates:

- Add/remove/update targets
- quick ping page  


### How to run

To run `http_requester`, you need a machine with Docker installed.

Create a `.env` file with the following values:

ADMIN_EMAIL=your_admin_email

ADMIN_PASSWORD=your_admin_password

HOST=your_server_hostname_or_ip

PORT_ACCOUNT=your_account_api_port

PORT_WEBSITES=your_website_api_port

MAX_THREADS= empty

PORT_MQTT=your_mqtt_port


Make sure to reference the `.env` file in your `docker-compose.yml`.

Build and start the application with:
docker compose build
docker compose up

The application should now be running.

---

## Tests (RSpec)

Specs live under `http_requester/spec/` in folders that mirror `lib/`:

- `spec/models/` — `Page`, `PageHandler`, `State`, `ImmediatePingWorker`, …
- `spec/services/` — `CurlService`, `FaradayService`, …

Examples follow **Arrange–Act–Assert** (`# Arrange` / `# Act` / `# Assert`).

From `http_requester/`:

```bash
bundle install
bundle exec rspec
```

CI: workflow **CI · Ruby HTTP worker (RSpec)** (`.github/workflows/ci-http-requester-ruby.yml`) kører ved push/PR når `HTTP/http_requester/` ændres.
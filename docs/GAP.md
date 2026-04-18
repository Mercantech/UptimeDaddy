# Gap-liste (repo-scan, agent)

Genereret som supplement til eksplicit `TODO`/`FIXME` i kilden. En fuldtekstsøgning i `.cs`, `.jsx`, `.js`, `.go` fandt **ingen** `TODO`/`FIXME`-kommentarer — listen nedenfor er derfor primært **arkitektur-, sikkerheds- og produkt-huller** observeret i kodebasen og build-output.

## Produkt / data

| Område | Gap |
|--------|-----|
| Incident-log | Historik **fra og med** migration `AddMonitorIncidentEvents`; ingen bagudfyldning fra gamle målinger. |
| `GET /api/measurements` | Dokumentation siger stadig «implement as needed» — afklar om endpoint skal scoperes til bruger eller forbliver admin/debug. |

## Backend

| Område | Gap |
|--------|-----|
| Afhængigheder | `KubernetesClient` 15.0.1: **NU1902** (moderat CVE) ifølge `dotnet build` — overvej opgradering eller fjernelse hvis pakken ikke er strengt nødvendig. |
| Tests | `IncidentsController` og den udvidede `MonitorStatusAlertService` (incident-rækker + Discord-guards) har ingen dedikerede unit/integration tests i den eksisterende test-suite (kun delvise controller-tests). |
| API-dokumentation | `Backend/UptimeDaddy.API/docs/api.md` er opdateret med `/api/incidents`; andre endpoints kan stadig mangle eksempler. |

## Frontend

| Område | Gap |
|--------|-----|
| Incident-log UX | Ingen eksport (CSV), ingen real-time push — kun fetch ved load og ved filter/page-skift. |
| Kontrast | Verificér Semantic UI-tabellen mod WCAG i jeres mørke tema hvis I har krav til tilgængelighed. |

## DevOps / drift

| Område | Gap |
|--------|-----|
| Migration | Efter deploy skal `monitor_incident_events` findes i DB (Compose kører typisk `Migrate()` ved opstart — dobbelttjek i jeres miljø). |

---

*Sidst opdateret ved implementering af incident-log (2026-04-18).*

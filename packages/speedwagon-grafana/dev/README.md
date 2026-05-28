# speedwagon-grafana dev stack

Local Grafana + Prometheus + Loki stack for verifying `speedwagon-grafana`'s 17 read tools against real datasources without touching production.

## Why this exists

Production Grafana is behind SSO (Keycloak) and service account token issuance requires SRE coordination. This stack lets you exercise every tool end-to-end on your own machine first, so the SRE conversation can be "we've verified these N tools work, please scope an SA accordingly" rather than "trust us."

## What you get

| Service | Port | Notes |
| --- | --- | --- |
| Grafana | http://localhost:3000 | admin / admin. Datasources + sample dashboard auto-provisioned. |
| Prometheus | http://localhost:9090 | Scrapes itself, Grafana, and Loki. |
| Loki | http://localhost:3100 | TSDB filesystem store. |
| Promtail | (internal) | Tails docker container stdout into Loki. |
| log-generator | (internal) | Emits random log lines so Loki always has something to query. |

A sample dashboard `speedwagon-dev` is preloaded with one Prometheus panel and one Loki panel — used by `search_dashboards`, `get_dashboard_*`, `get_dashboard_panel_queries`.

## Run

```bash
cd packages/speedwagon-grafana/dev
docker compose up -d
docker compose ps      # confirm 5 services healthy
```

Open http://localhost:3000 (admin / admin). Browse to Dashboards → "Speedwagon Dev Sample" to confirm both panels render data.

## Issue a service account token

UI: Administration → Users and access → Service accounts → Add → role `Viewer` → "Add service account token".

Or via API:

```bash
SA_ID=$(curl -s -u admin:admin -X POST http://localhost:3000/api/serviceaccounts \
  -H 'Content-Type: application/json' \
  -d '{"name":"speedwagon-dev","role":"Viewer"}' | jq -r '.id')

curl -s -u admin:admin -X POST http://localhost:3000/api/serviceaccounts/$SA_ID/tokens \
  -H 'Content-Type: application/json' \
  -d '{"name":"speedwagon-dev-token"}' | jq -r '.key'
```

The returned token is the value to pass as `GRAFANA_SERVICE_ACCOUNT_TOKEN`.

## Tear down

```bash
docker compose down -v
```

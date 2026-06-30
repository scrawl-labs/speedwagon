# @scrawl-labs/speedwagon-grafana

Grafana MCP server — dashboard search, metric queries, anomaly detection, and incident timeline via Grafana HTTP API. Read-only.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-grafana
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GRAFANA_URL` | Yes | Grafana instance URL (e.g. `https://grafana.example.com`) |
| `GRAFANA_SERVICE_ACCOUNT_TOKEN` | Yes | Service Account token (Viewer role is sufficient) |

### Token Setup

1. Grafana → Administration → Service Accounts
2. Create a service account with **Viewer** role
3. Generate a token

### MCP Client Configuration

Add to `~/.mcp.json` or project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "speedwagon-grafana": {
      "command": "speedwagon-grafana",
      "env": {
        "GRAFANA_URL": "https://grafana.example.com",
        "GRAFANA_SERVICE_ACCOUNT_TOKEN": "glsa_xxxxxxxxxxxx"
      }
    }
  }
}
```

## Tools

### Dashboard Discovery

| Tool | Description |
|------|-------------|
| `search_dashboards` | Search dashboards by title, folder, or tag |
| `get_dashboard` | Get dashboard details with all panels (id, title, type, datasource) |

### Metric Queries

| Tool | Description |
|------|-------------|
| `query_panel` | Execute a panel's configured queries and return time series data |

### Analysis

| Tool | Description |
|------|-------------|
| `detect_anomaly` | Z-score based spike/drop detection on panel metrics. Configurable sensitivity. |
| `incident_timeline` | Chronological timeline of alert state changes, active alerts, and annotations |

## Usage Examples

```
"Show me all dashboards"           → search_dashboards
"What panels are in this dashboard" → get_dashboard (with UID)
"Show me CPU metrics"              → query_panel (with UID + panel ID)
"Any anomalies in the last 6h?"    → detect_anomaly (with UID + panel ID)
"What alerts fired today?"         → incident_timeline (from: now-24h)
```

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

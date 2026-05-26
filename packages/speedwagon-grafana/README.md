# @scrawl-labs/speedwagon-grafana

Grafana MCP server in the Speedwagon family. It's a **read-only gateway** in front of the official [`mcp-grafana`](https://github.com/grafana/mcp-grafana): Speedwagon spawns the official server with `--disable-write`, then re-exposes a curated subset of observability **read** tools (dashboards, datasources, Prometheus, Loki).

## Prerequisites

The official `mcp-grafana` binary must be runnable. Easiest is [`uv`](https://docs.astral.sh/uv/) (then `uvx mcp-grafana` works), or install the binary / Docker image per its README.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-grafana
```

Add to your MCP client config (e.g. `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "speedwagon-grafana": {
      "command": "speedwagon-grafana",
      "env": {
        "GRAFANA_URL": "https://your-stack.grafana.net",
        "GRAFANA_SERVICE_ACCOUNT_TOKEN": "glsa_xxx"
      }
    }
  }
}
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GRAFANA_URL` | Yes | Grafana instance URL |
| `GRAFANA_SERVICE_ACCOUNT_TOKEN` | Yes | Service account token (Viewer role is enough) |
| `GRAFANA_MCP_COMMAND` | No | Override the upstream launcher (default `uvx`) |
| `GRAFANA_MCP_ARGS` | No | Override upstream args (default `mcp-grafana -t stdio --disable-write`) |

## Exposed tools

`search_dashboards`, `get_dashboard_by_uid`, `get_dashboard_summary`, `get_dashboard_property`, `get_dashboard_panel_queries`, `list_datasources`, `get_datasource`, `query_prometheus`, `query_prometheus_histogram`, `list_prometheus_metric_metadata`, `list_prometheus_metric_names`, `list_prometheus_label_names`, `list_prometheus_label_values`, `query_loki_logs`, `query_loki_stats`, `list_loki_label_names`, `list_loki_label_values`.

Everything else `mcp-grafana` offers (alerting writes, incidents, OnCall, admin) is filtered out, and `--disable-write` blocks writes at the source as a second layer.

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

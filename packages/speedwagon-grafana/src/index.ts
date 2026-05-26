#!/usr/bin/env node
import { proxyMcpServer } from "@scrawl-labs/speedwagon";
import { config } from "./config.js";

const ALLOWED_TOOLS = new Set([
  "search_dashboards",
  "get_dashboard_by_uid",
  "get_dashboard_summary",
  "get_dashboard_property",
  "get_dashboard_panel_queries",
  "list_datasources",
  "get_datasource",
  "query_prometheus",
  "query_prometheus_histogram",
  "list_prometheus_metric_metadata",
  "list_prometheus_metric_names",
  "list_prometheus_label_names",
  "list_prometheus_label_values",
  "query_loki_logs",
  "query_loki_stats",
  "list_loki_label_names",
  "list_loki_label_values",
]);

proxyMcpServer({
  name: "speedwagon-grafana",
  version: "0.1.0",
  upstream: {
    kind: "stdio",
    command: config.command,
    args: config.args,
    env: {
      GRAFANA_URL: config.grafanaUrl,
      GRAFANA_SERVICE_ACCOUNT_TOKEN: config.serviceAccountToken,
    },
  },
  allow: (tool) => ALLOWED_TOOLS.has(tool.name),
}).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

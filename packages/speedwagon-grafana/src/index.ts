#!/usr/bin/env node
import { runMcpServer, defineTool } from "@scrawl-labs/speedwagon";
import { searchDashboardsSchema, searchDashboards } from "./tools/search.js";
import { getDashboardSchema, getDashboard } from "./tools/get-dashboard.js";
import { queryPanelSchema, queryPanel } from "./tools/query-panel.js";

runMcpServer({
  name: "speedwagon-grafana",
  version: "0.2.0",
  tools: [
    defineTool({
      name: "search_dashboards",
      description:
        "Search Grafana dashboards by title, folder name, or tag. Returns UID, title, folder, and tags for each match.",
      inputSchema: searchDashboardsSchema,
      annotations: { readOnlyHint: true },
      handler: searchDashboards,
    }),
    defineTool({
      name: "get_dashboard",
      description:
        "Get dashboard details including all panels (id, title, type, datasource). Use the panel IDs with query_panel to fetch actual metric data.",
      inputSchema: getDashboardSchema,
      annotations: { readOnlyHint: true },
      handler: getDashboard,
    }),
    defineTool({
      name: "query_panel",
      description:
        "Query a specific panel's metric data. Executes the panel's configured queries against its datasource and returns time series results.",
      inputSchema: queryPanelSchema,
      annotations: { readOnlyHint: true },
      handler: queryPanel,
    }),
  ],
}).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

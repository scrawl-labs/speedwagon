#!/usr/bin/env node
import { runMcpServer, defineTool } from "@scrawl-labs/speedwagon";
import { listIndicesSchema, listIndices } from "./tools/list-indices.js";
import { searchLogsSchema, searchLogs } from "./tools/search-logs.js";
import { errorSummarySchema, errorSummary } from "./tools/error-summary.js";

runMcpServer({
  name: "speedwagon-elastic",
  version: "0.2.0",
  tools: [
    defineTool({
      name: "list_indices",
      description:
        "List Elasticsearch indices with document count and size. Use to discover available log indices before searching.",
      inputSchema: listIndicesSchema,
      annotations: { readOnlyHint: true },
      handler: listIndices,
    }),
    defineTool({
      name: "search_logs",
      description:
        "Search log entries by free-text query, log level, user, URI, service, and time range. Returns matching log documents sorted by newest first.",
      inputSchema: searchLogsSchema,
      annotations: { readOnlyHint: true },
      handler: searchLogs,
    }),
    defineTool({
      name: "error_summary",
      description:
        "Aggregate error logs and show top error groups with counts and hourly trend. Group by error message, URI, service, or status code.",
      inputSchema: errorSummarySchema,
      annotations: { readOnlyHint: true },
      handler: errorSummary,
    }),
  ],
}).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

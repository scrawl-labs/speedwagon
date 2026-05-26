#!/usr/bin/env node
import { proxyMcpServer } from "@scrawl-labs/speedwagon";
import { config } from "./config.js";

// Agent Builder tools are user-configured in Kibana and the ApiKey scopes
// access to read-only, so every exposed tool is passed through unfiltered.
proxyMcpServer({
  name: "speedwagon-elastic",
  version: "0.1.0",
  upstream: {
    kind: "http",
    url: config.mcpUrl,
    headers: { Authorization: `ApiKey ${config.apiKey}` },
  },
}).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

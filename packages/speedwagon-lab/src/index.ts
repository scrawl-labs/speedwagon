#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  closeDb,
  explainSchema,
  explain,
  explainAnalyzeSchema,
  explainAnalyze,
  indexListSchema,
  indexList,
  indexSuggestSchema,
  indexSuggest,
  slowQueriesSchema,
  slowQueries,
  findSchema,
  find,
  aggregateSchema,
  aggregate,
} from "@scrawl-labs/speedwagon-core";
import { closeRawDb } from "./raw-client.js";
import { indexSyncSchema, indexSync } from "./tools/index-sync.js";
import { seedSchema, seed } from "./tools/seed.js";
import { clearSchema, clear } from "./tools/clear.js";

const server = new McpServer({
  name: "speedwagon-lab",
  version: "0.1.0",
});

// --- Read-only tools (shared with audit) ---

server.registerTool("explain", {
  description: "Analyze a MongoDB query execution plan (queryPlanner mode).",
  inputSchema: explainSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await explain(input) }],
}));

server.registerTool("explain_analyze", {
  description: "Execute a MongoDB query and return executionStats. The query is actually executed.",
  inputSchema: explainAnalyzeSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await explainAnalyze(input) }],
}));

server.registerTool("index_list", {
  description: "List all indexes and their sizes for a collection.",
  inputSchema: indexListSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await indexList(input) }],
}));

server.registerTool("index_suggest", {
  description: "Analyze explain results and suggest optimal indexes.",
  inputSchema: indexSuggestSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await indexSuggest(input) }],
}));

server.registerTool("slow_queries", {
  description: "Query slow operations from the MongoDB profiler.",
  inputSchema: slowQueriesSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await slowQueries(input) }],
}));

server.registerTool("find", {
  description: "Find documents in a collection (capped at 100 docs per call).",
  inputSchema: findSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await find(input) }],
}));

server.registerTool("aggregate", {
  description: "Run an aggregation pipeline (write stages $out, $merge are blocked).",
  inputSchema: aggregateSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await aggregate(input) }],
}));

// --- Lab-only write tools (localhost-only) ---

server.registerTool("seed", {
  description:
    "Seed synthetic documents into a local collection using faker. Specify a schema mapping field names to faker paths (e.g. internet.email, number.int). Localhost only.",
  inputSchema: seedSchema,
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => ({
  content: [{ type: "text", text: await seed(input) }],
}));

server.registerTool("clear", {
  description:
    "Delete all documents from a local collection. Requires confirm=true. Localhost only.",
  inputSchema: clearSchema,
  annotations: { readOnlyHint: false, destructiveHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await clear(input) }],
}));

server.registerTool("index_sync", {
  description:
    "Copy index definitions from a source MongoDB (e.g. Atlas prod) to the local lab DB. dry_run=true by default. Localhost only as target.",
  inputSchema: indexSyncSchema,
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => ({
  content: [{ type: "text", text: await indexSync(input) }],
}));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await Promise.all([closeDb(), closeRawDb()]);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

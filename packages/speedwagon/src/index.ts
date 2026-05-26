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

const server = new McpServer({
  name: "speedwagon",
  version: "0.1.0",
});

server.registerTool("explain", {
  description: "Analyze a MongoDB query execution plan (queryPlanner mode). Shows scan type such as COLLSCAN/IXSCAN.",
  inputSchema: explainSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await explain(input) }],
}));

server.registerTool("explain_analyze", {
  description: "Execute a MongoDB query and return executionStats. Shows actual execution time, documents examined, etc. Warning: the query is actually executed.",
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
  description: "Analyze query explain results and suggest optimal indexes. Provides createIndex commands when COLLSCAN is detected.",
  inputSchema: indexSuggestSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await indexSuggest(input) }],
}));

server.registerTool("slow_queries", {
  description: "Query slow operations from the MongoDB profiler. Provides instructions to enable the profiler if it is disabled.",
  inputSchema: slowQueriesSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await slowQueries(input) }],
}));

server.registerTool("find", {
  description: "Find documents in a collection. Returns up to 100 documents matching the filter. Use for looking up specific records by field values.",
  inputSchema: findSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await find(input) }],
}));

server.registerTool("aggregate", {
  description: "Run a MongoDB aggregation pipeline. Supports $match, $group, $sort, $project, $unwind, $lookup, etc. Write stages ($out, $merge) are blocked.",
  inputSchema: aggregateSchema,
  annotations: { readOnlyHint: true },
}, async (input) => ({
  content: [{ type: "text", text: await aggregate(input) }],
}));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await closeDb();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

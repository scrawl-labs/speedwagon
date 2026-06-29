#!/usr/bin/env node
import { runMcpServer, defineTool } from "@scrawl-labs/speedwagon";
import { closeAll } from "./client.js";
import { explainSchema, explain } from "./tools/explain.js";
import { explainAnalyzeSchema, explainAnalyze } from "./tools/explain-analyze.js";
import { indexListSchema, indexList } from "./tools/index-list.js";
import { indexSuggestSchema, indexSuggest } from "./tools/index-suggest.js";
import { slowQueriesSchema, slowQueries } from "./tools/slow-queries.js";
import { findSchema, find } from "./tools/find.js";
import { aggregateSchema, aggregate } from "./tools/aggregate.js";

runMcpServer({
  name: "speedwagon-mongodb",
  version: "0.1.0",
  onShutdown: closeAll,
  tools: [
    defineTool({
      name: "explain",
      description:
        "Analyze a MongoDB query execution plan (queryPlanner mode). Shows scan type such as COLLSCAN/IXSCAN.",
      inputSchema: explainSchema,
      annotations: { readOnlyHint: true },
      handler: explain,
    }),
    defineTool({
      name: "explain_analyze",
      description:
        "Execute a MongoDB query and return executionStats. Shows actual execution time, documents examined, etc. Warning: the query is actually executed.",
      inputSchema: explainAnalyzeSchema,
      annotations: { readOnlyHint: true },
      handler: explainAnalyze,
    }),
    defineTool({
      name: "index_list",
      description: "List all indexes and their sizes for a collection.",
      inputSchema: indexListSchema,
      annotations: { readOnlyHint: true },
      handler: indexList,
    }),
    defineTool({
      name: "index_suggest",
      description:
        "Analyze query explain results and suggest optimal indexes. Provides createIndex commands when COLLSCAN is detected.",
      inputSchema: indexSuggestSchema,
      annotations: { readOnlyHint: true },
      handler: indexSuggest,
    }),
    defineTool({
      name: "slow_queries",
      description:
        "Query slow operations from the MongoDB profiler. Provides instructions to enable the profiler if it is disabled.",
      inputSchema: slowQueriesSchema,
      annotations: { readOnlyHint: true },
      handler: slowQueries,
    }),
    defineTool({
      name: "find",
      description:
        "Find documents in a collection. Returns up to 100 documents matching the filter. Use for looking up specific records by field values.",
      inputSchema: findSchema,
      annotations: { readOnlyHint: true },
      handler: find,
    }),
    defineTool({
      name: "aggregate",
      description:
        "Run a MongoDB aggregation pipeline. Supports $match, $group, $sort, $project, $unwind, $lookup, etc. Write stages ($out, $merge) are blocked.",
      inputSchema: aggregateSchema,
      annotations: { readOnlyHint: true },
      handler: aggregate,
    }),
  ],
}).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

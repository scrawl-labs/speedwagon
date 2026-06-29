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
import { insertSchema, insert } from "./tools/insert.js";
import { updateSchema, update } from "./tools/update.js";
import { deleteSchema, del } from "./tools/delete.js";
import { listEnvironmentsSchema, listEnvironments } from "./tools/list-environments.js";
import { switchEnvSchema, switchEnv } from "./tools/switch-env.js";

runMcpServer({
  name: "speedwagon-mongodb",
  version: "0.2.0",
  onShutdown: closeAll,
  tools: [
    defineTool({
      name: "list_environments",
      description:
        "List all configured MongoDB environments and show which one is currently active. Use this first to see available databases.",
      inputSchema: listEnvironmentsSchema,
      annotations: { readOnlyHint: true },
      handler: listEnvironments,
    }),
    defineTool({
      name: "switch_env",
      description:
        "Switch the active MongoDB environment. After switching, all subsequent tool calls will target the new environment by default.",
      inputSchema: switchEnvSchema,
      annotations: { readOnlyHint: true },
      handler: switchEnv,
    }),
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
    defineTool({
      name: "insert",
      description:
        "Insert documents into a collection. Blocked on read-only environments (op). Provide documents as a JSON array.",
      inputSchema: insertSchema,
      annotations: { readOnlyHint: false },
      handler: insert,
    }),
    defineTool({
      name: "update",
      description:
        "Update documents in a collection. Blocked on read-only environments (op). Set many=true for updateMany.",
      inputSchema: updateSchema,
      annotations: { readOnlyHint: false },
      handler: update,
    }),
    defineTool({
      name: "delete",
      description:
        "Delete documents from a collection. Blocked on read-only environments (op). Empty filter {} is rejected for safety. Set many=true for deleteMany.",
      inputSchema: deleteSchema,
      annotations: { readOnlyHint: false },
      handler: del,
    }),
  ],
}).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

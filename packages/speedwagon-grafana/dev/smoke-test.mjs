#!/usr/bin/env node
// Smoke-test all 17 tools exposed by speedwagon-grafana against the local
// docker-compose stack. Spawns the built server over stdio and exercises each
// tool with realistic inputs derived from the provisioned datasources +
// sample dashboard.
//
// Run from the monorepo root or from this directory:
//   GRAFANA_SERVICE_ACCOUNT_TOKEN=glsa_... node packages/speedwagon-grafana/dev/smoke-test.mjs
//
// Defaults assume the stack at http://localhost:3000.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = resolve(__dirname, "../dist/index.js");

const GRAFANA_URL = process.env.GRAFANA_URL ?? "http://localhost:3000";
const TOKEN = process.env.GRAFANA_SERVICE_ACCOUNT_TOKEN;
if (!TOKEN) {
  console.error("GRAFANA_SERVICE_ACCOUNT_TOKEN must be set.");
  process.exit(1);
}

const DASHBOARD_UID = "speedwagon-dev";
const PROM_UID = "prometheus";
const LOKI_UID = "loki";

const RANGE_FROM = "now-15m";
const RANGE_TO = "now";

const NOW_MS = Date.now();
const FROM_MS = NOW_MS - 15 * 60 * 1000;
const LOKI_START = new Date(FROM_MS).toISOString();
const LOKI_END = new Date(NOW_MS).toISOString();

const CALLS = [
  ["search_dashboards", { query: "speedwagon" }],
  ["get_dashboard_by_uid", { uid: DASHBOARD_UID }],
  ["get_dashboard_summary", { uid: DASHBOARD_UID }],
  ["get_dashboard_property", { uid: DASHBOARD_UID, jsonPath: "$.title" }],
  ["get_dashboard_panel_queries", { uid: DASHBOARD_UID }],
  ["list_datasources", {}],
  ["get_datasource", { uid: PROM_UID }],
  [
    "query_prometheus",
    {
      datasourceUid: PROM_UID,
      expr: "up",
      startTime: RANGE_FROM,
      endTime: RANGE_TO,
      queryType: "range",
      stepSeconds: 60,
    },
  ],
  [
    "query_prometheus_histogram",
    {
      datasourceUid: PROM_UID,
      expr: "prometheus_http_request_duration_seconds_bucket",
      startTime: RANGE_FROM,
      endTime: RANGE_TO,
      stepSeconds: 60,
    },
  ],
  ["list_prometheus_metric_metadata", { datasourceUid: PROM_UID, limit: 5 }],
  [
    "list_prometheus_metric_names",
    { datasourceUid: PROM_UID, regex: "prometheus_.*", limit: 10 },
  ],
  ["list_prometheus_label_names", { datasourceUid: PROM_UID }],
  [
    "list_prometheus_label_values",
    { datasourceUid: PROM_UID, labelName: "job" },
  ],
  [
    "query_loki_logs",
    {
      datasourceUid: LOKI_UID,
      logql: '{container=~".+"}',
      startRfc3339: LOKI_START,
      endRfc3339: LOKI_END,
      limit: 3,
    },
  ],
  [
    "query_loki_stats",
    {
      datasourceUid: LOKI_UID,
      logql: '{container=~".+"}',
      startRfc3339: LOKI_START,
      endRfc3339: LOKI_END,
    },
  ],
  ["list_loki_label_names", { datasourceUid: LOKI_UID }],
  [
    "list_loki_label_values",
    { datasourceUid: LOKI_UID, labelName: "container" },
  ],
];

const transport = new StdioClientTransport({
  command: "node",
  args: [SERVER_ENTRY],
  env: {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    GRAFANA_URL,
    GRAFANA_SERVICE_ACCOUNT_TOKEN: TOKEN,
  },
});

const client = new Client({ name: "smoke-test", version: "0.0.0" }, {});
await client.connect(transport);

const listed = await client.listTools();
const listedNames = new Set(listed.tools.map((t) => t.name));
const expected = new Set(CALLS.map(([n]) => n));

const missing = [...expected].filter((n) => !listedNames.has(n));
const unexpected = [...listedNames].filter((n) => !expected.has(n));

console.log(`Listed tools: ${listed.tools.length}`);
if (missing.length > 0) console.log(`  Missing expected: ${missing.join(", ")}`);
if (unexpected.length > 0) console.log(`  Unexpected exposed: ${unexpected.join(", ")}`);

const results = [];
for (const [name, args] of CALLS) {
  if (!listedNames.has(name)) {
    results.push({ name, status: "NOT_EXPOSED", note: "" });
    continue;
  }
  try {
    const out = await client.callTool({ name, arguments: args });
    const text = out.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ") ?? "";
    const head = text.slice(0, 80).replace(/\s+/g, " ");
    results.push({
      name,
      status: out.isError ? "TOOL_ERROR" : "OK",
      note: head,
    });
  } catch (err) {
    results.push({
      name,
      status: "EXCEPTION",
      note: (err instanceof Error ? err.message : String(err)).slice(0, 120),
    });
  }
}

const pad = (s, n) => s.padEnd(n);
console.log("\n=== Tool results ===");
console.log(`${pad("TOOL", 32)} ${pad("STATUS", 12)} NOTE`);
for (const r of results) {
  console.log(`${pad(r.name, 32)} ${pad(r.status, 12)} ${r.note}`);
}

const okCount = results.filter((r) => r.status === "OK").length;
const failCount = results.length - okCount;
console.log(`\n${okCount}/${results.length} OK · ${failCount} failed`);

await client.close();
process.exit(failCount === 0 ? 0 : 1);

# Speedwagon

<p align="center">
  <img src=".github/assets/speedwagon.png" width="800"/>
</p>

<p align="center"><strong>An MCP server family for your data infrastructure — MongoDB, Elastic, Grafana.</strong></p>

> **Side project notice** — Maintained as a side project. Best-effort response time on issues and PRs. For production use, please pin specific versions.

An MCP server family that sits between your AI agent and your data infrastructure. Ask questions in plain language. Get back MongoDB explain plans, index suggestions, slow query reports, Elastic APM traces and logs, and Grafana dashboard metrics — without opening four tabs.

MongoDB talks to the database directly. Elastic and Grafana are read-only gateways over their official MCP servers.

## Packages

| Package                                                            | Purpose                                                                                     | Status                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------- |
| [`@scrawl-labs/speedwagon`](./packages/speedwagon)                 | Shared MCP infrastructure (`runMcpServer`, `defineTool`, env helpers). Not a server itself. | Stable                  |
| [`@scrawl-labs/speedwagon-mongodb`](./packages/speedwagon-mongodb) | **Audit** MongoDB queries on production / shared DBs. Read-only by construction.            | Stable                  |
| [`@scrawl-labs/speedwagon-elastic`](./packages/speedwagon-elastic) | Elastic APM + logs. Read-only gateway over the Kibana Agent Builder MCP.                     | Beta                    |
| [`@scrawl-labs/speedwagon-grafana`](./packages/speedwagon-grafana) | Grafana dashboards + metrics. Read-only gateway over the official `mcp-grafana`.             | Beta                    |

`speedwagon-mongodb` talks to MongoDB directly. `speedwagon-elastic` and `speedwagon-grafana` are **gateways**: they connect to the official Elastic / Grafana MCP servers as a client and re-expose a curated, read-only slice of their tools. Backend-specific guardrails live in each backend package, not the shared infra.

## Why this exists

You're staring at a slow endpoint. You know it's a MongoDB query. You open Compass, copy the query, run explain, squint at the output, Google what `COLLSCAN` means again, check which indexes exist, realize the index doesn't cover your sort field, alt-tab back to your editor.

Or you just ask your agent: "why is the users query slow?" — and Speedwagon connects, runs explain, reads the plan, checks your indexes, and tells you what's wrong.

The same context-switching tax shows up everywhere your data lives. Chasing one incident usually means Kibana in one tab for logs and APM traces, Grafana in another for dashboards and metrics, and your editor in a third. Speedwagon puts all three behind the same agent: ask about a slow query, an error spike, or a latency regression in one conversation. No tab-juggling, no copy-paste.

## Install

This is a monorepo. Once published to npm, install whichever package you need:

```bash
# MongoDB audit MCP (read-only):
npm install -g @scrawl-labs/speedwagon-mongodb

# Elastic logs/APM gateway (needs a Kibana Agent Builder API key):
npm install -g @scrawl-labs/speedwagon-elastic

# Grafana metrics gateway (needs the official mcp-grafana available, e.g. via uvx):
npm install -g @scrawl-labs/speedwagon-grafana
```

Or from source:

```bash
git clone https://github.com/scrawl-labs/speedwagon.git
cd speedwagon
pnpm install
pnpm build   # Turborepo-orchestrated build across all packages
```

> This is a pnpm + Turborepo monorepo. Use `pnpm install` (not `npm install`) so the `workspace:*` links resolve.

Create a `.env` file (see [.env.example](./.env.example) for the recommended form):

```
MONGODB_URI=mongodb+srv://readonly_user:password@cluster.mongodb.net/?readPreference=secondaryPreferred
MONGODB_DATABASE=your_db
```

Wire it into your MCP client (e.g. `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "speedwagon-mongodb": {
      "command": "node",
      "args": [
        "/absolute/path/to/speedwagon/packages/speedwagon-mongodb/dist/index.js"
      ]
    }
  }
}
```

Restart your agent. That's it.

## Tools

### `@scrawl-labs/speedwagon-mongodb`

#### 🔍 `explain`

Runs `queryPlanner` mode. Shows whether your query hits an index or does a full collection scan. No data is touched.

> "explain the find query on users where email is alice@example.com"

#### ⚡ `explain_analyze`

Runs `executionStats` mode — execution time, documents examined, keys examined. **The query runs for real**, so prefer a secondary read preference on production.

> "how many documents does MongoDB actually scan for this query?"

#### 📋 `index_list`

Every index on a collection with key pattern, uniqueness, and size in bytes.

> "what indexes exist on the orders collection?"

#### 💡 `index_suggest`

Runs explain, checks for COLLSCAN, compares against existing indexes, suggests what to create. Gives you the `createIndex` command ready to copy-paste.

> "suggest an index for querying orders by userId sorted by createdAt"

#### 🐢 `slow_queries`

Pulls from `system.profile`. If the profiler isn't enabled, tells you how to turn it on.

> "show me queries slower than 200ms on the payments collection"

#### 🔎 `find`

Query documents in plain language. Hard-capped at 100 documents per call.

> "find the user with email alice@example.com"

#### 🧮 `aggregate`

Run aggregation pipelines. Write stages (`$out`, `$merge`) are blocked. Auto-appends `$limit` if you forget one.

> "group orders by userId and sum the total amount"

### `@scrawl-labs/speedwagon-elastic`

A gateway over the Kibana Agent Builder MCP (`{KIBANA_URL}/api/agent_builder/mcp`). It connects with your `ApiKey` and re-exposes whatever tools Agent Builder offers — the built-in ES|QL / search tools reach APM (`traces-apm*`) and log (`logs-*`) data streams. Read-only is enforced by the API key's `feature_agentBuilder.read` privilege. See [the package README](./packages/speedwagon-elastic).

> "search the logs index for errors from the checkout service in the last hour"

### `@scrawl-labs/speedwagon-grafana`

A gateway over the official [`mcp-grafana`](https://github.com/grafana/mcp-grafana). Speedwagon spawns it with `--disable-write` and exposes a curated read-only slice: dashboard search/inspection, datasource listing, and Prometheus / Loki queries. Requires the `mcp-grafana` binary to be runnable (e.g. via `uvx`). See [the package README](./packages/speedwagon-grafana).

> "query the prometheus rate of http_requests_total for the api service over 5m"

## Environment variables

| Variable                        | Required | Used by                           | Description                                      |
| ------------------------------- | -------- | --------------------------------- | ------------------------------------------------ |
| `MONGODB_URI`                   | Yes      | `@scrawl-labs/speedwagon-mongodb` | Connection string for the target MongoDB         |
| `MONGODB_DATABASE`              | Yes      | `@scrawl-labs/speedwagon-mongodb` | Database name to analyze                         |
| `KIBANA_URL`                    | Yes      | `@scrawl-labs/speedwagon-elastic` | Base URL of your Kibana instance                 |
| `ELASTIC_API_KEY`               | Yes      | `@scrawl-labs/speedwagon-elastic` | API key with `feature_agentBuilder.read`         |
| `KIBANA_SPACE`                  | No       | `@scrawl-labs/speedwagon-elastic` | Target a non-default Kibana space                |
| `GRAFANA_URL`                   | Yes      | `@scrawl-labs/speedwagon-grafana` | Grafana instance URL                             |
| `GRAFANA_SERVICE_ACCOUNT_TOKEN` | Yes      | `@scrawl-labs/speedwagon-grafana` | Service account token (Viewer role is enough)    |
| `GRAFANA_MCP_COMMAND`           | No       | `@scrawl-labs/speedwagon-grafana` | Override the upstream launcher (default `uvx`)   |
| `GRAFANA_MCP_ARGS`              | No       | `@scrawl-labs/speedwagon-grafana` | Override upstream args                           |

For Atlas: the URI already includes TLS. Append `?readPreference=secondaryPreferred` to keep load off primary.

See [.env.example](./.env.example) for a copy-paste starting point covering all three backends.

## Guardrails

Speedwagon is paranoid about your data. Layered defenses:

| Layer                      | Where                | What it does                                                                                                                             |
| -------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Per-backend package**    | each backend pkg     | Each backend's source never imports its driver's write APIs. Provable by `grep`.                                                         |
| **Read-only proxy**        | `speedwagon-mongodb` | Every collection is wrapped in a Proxy that throws on `insertOne`, `deleteMany`, `drop`, and 13 other write methods at the driver level. |
| **Aggregate stage filter** | `speedwagon-mongodb` | `$out` and `$merge` are rejected before the pipeline runs.                                                                               |
| **Hard limits**            | `speedwagon-mongodb` | `find` caps at 100 docs, `aggregate` caps at 200 results.                                                                                |
| **Curated tool allowlist** | `speedwagon-grafana` | Only read tools are re-exposed; the upstream `mcp-grafana` is also spawned with `--disable-write`.                                       |
| **Read-only API key**      | `speedwagon-elastic` | Access is scoped by the Kibana `feature_agentBuilder.read` privilege on the API key.                                                     |

Pair this with a read-only Atlas user and `readPreference=secondaryPreferred` and the blast radius is essentially zero.

## The workflows that actually help

### Case A — Slow query in production (MongoDB)

```
You:    "list indexes on the transactions collection"
Agent:  [calls index_list]   → 3 indexes shown
You:    "explain the query filtering by merchantId sorted by timestamp desc"
Agent:  [calls explain]      → COLLSCAN detected
You:    "suggest an index"
Agent:  [calls index_suggest] → db.transactions.createIndex({merchantId:1, timestamp:-1})
You:    "run explain_analyze on the current query"
Agent:  [calls explain_analyze] → 542ms, 1.2M docs examined, 47 returned
```

Four messages. Problem identified, solution ready, no tab switching.

### Case B — Tracing an error spike (Elastic)

```
You:    "search logs-* for ERROR from the checkout service in the last 30 minutes"
Agent:  [Agent Builder search] → 412 errors, mostly "payment gateway timeout"
You:    "pull the slowest checkout APM traces in that window"
Agent:  [traces-apm* search]   → p99 3.1s, stalled on the payments-api call
```

From "something's on fire" to a named downstream dependency — without leaving the chat.

### Case C — Confirming a deploy regressed latency (Grafana)

```
You:    "query the prometheus rate of http_requests_total for the api service over 5m"
Agent:  [query_prometheus]            → traffic flat, so it isn't load
You:    "find the api dashboard and show me its latency panel queries"
Agent:  [search_dashboards + get_dashboard_panel_queries] → p95 panel query returned
```

Metrics and dashboards answer "did my deploy do this?" in the same place you asked the question.

## Tech stack

- TypeScript (project references) on a pnpm + Turborepo monorepo
- `@modelcontextprotocol/sdk` — MCP protocol, used as both **server** and **client**. `speedwagon-elastic` / `speedwagon-grafana` ship no data-source driver of their own: they run an MCP client that connects to the official upstream server (Kibana Agent Builder over HTTP, `mcp-grafana` over stdio) and re-expose a read-only slice of its tools.
- `mongodb` — Node driver (`speedwagon-mongodb` only — the one backend that talks to a database directly)
- `zod` — input validation
- `dotenv` — env loading

## Contributing

Issues and PRs welcome — see the templates under `.github/ISSUE_TEMPLATE/`. This is a side project, so response time is best-effort.

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 Yongtaek Lee.

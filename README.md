# mongodb-speedwagon

<p align="center">
  <img src=".github/assets/speedwagon.png" width="800"/>
</p>

<p align="center"><em>"You look like you're wonderin' 'why the heck is this query slow?!' Allow me to explain! The name's Speedwagon!"</em></p>

> **Side project notice** — Maintained as a side project. Best-effort response time on issues and PRs. For production use, please pin specific versions.

An MCP server family that sits between your AI agent and MongoDB. Ask questions about your queries in plain language. Get back explain plans, index suggestions, and slow query reports — without opening Compass or writing `db.collection.explain()` by hand.

## Two packages, one promise

| Package | Purpose | Where it runs |
|---------|---------|---------------|
| [`@scrawl-labs/speedwagon`](./packages/speedwagon) | **Audit** existing slow queries on production / shared DBs. | Any MongoDB. Read-only by construction — write methods aren't even imported. |
| [`@scrawl-labs/speedwagon-lab`](./packages/speedwagon-lab) | **Preflight** new collections locally. Seed synthetic data with faker, sync prod indexes, analyze at scale. | Local mongod only. Refuses non-local hosts at startup. |

The two are deliberately separated so the "audit" package is provably safe — you can grep the source and find no `insertOne`, `createIndex`, or `deleteMany` calls. Writes live in `speedwagon-lab` and only.

## Why this exists

You're staring at a slow endpoint. You know it's a MongoDB query. You open Compass, copy the query, run explain, squint at the output, Google what `COLLSCAN` means again, check which indexes exist, realize the index doesn't cover your sort field, alt-tab back to your editor.

Or you just ask your agent: "why is the users query slow?"

Speedwagon connects, runs explain, reads the plan, checks your indexes, and tells you what's wrong. One conversation. No context switching.

## Install

This is a monorepo. Once published to npm, install whichever package you need:

```bash
# For production query analysis (read-only):
npm install -g @scrawl-labs/speedwagon

# For local lab work (write-allowed, localhost-only):
npm install -g @scrawl-labs/speedwagon-lab
```

Or from source:

```bash
git clone https://github.com/scrawl-labs/mongodb-speedwagon.git
cd mongodb-speedwagon
npm install
npm run build
```

Create a `.env` file (see [.env.example](./.env.example) for the recommended form):

```
MONGODB_URI=mongodb+srv://readonly_user:password@cluster.mongodb.net/?readPreference=secondaryPreferred
MONGODB_DATABASE=your_db
```

Wire it into your MCP client (e.g. `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "speedwagon": {
      "command": "node",
      "args": ["/absolute/path/to/mongodb-speedwagon/packages/speedwagon/dist/index.js"]
    },
    "speedwagon-lab": {
      "command": "node",
      "args": ["/absolute/path/to/mongodb-speedwagon/packages/speedwagon-lab/dist/index.js"]
    }
  }
}
```

Restart your agent. That's it.

## Tools

### Shared (both packages)

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

### Lab-only (`@scrawl-labs/speedwagon-lab`)

These write to your local mongod. The package refuses to connect to a non-local host at startup.

#### 🌱 `seed`
Generate synthetic documents with [faker](https://fakerjs.dev/). You describe the shape, the agent fills in the schema, faker produces realistic data. Batched inserts for speed (100k+ docs handled comfortably).

> "seed 50,000 users with email, full name, age 18-80, and a random signup date in the past 2 years"

Schema format:

```json
{
  "email":     { "type": "internet.email" },
  "name":      { "type": "person.fullName" },
  "age":       { "type": "number.int", "args": { "min": 18, "max": 80 } },
  "status":    { "static": "active" },
  "createdAt": { "type": "date.past", "args": { "years": 2 } }
}
```

#### 🧹 `clear`
`deleteMany({})` on a collection. Requires `confirm: true`. Localhost only.

> "clear the users collection in my lab"

#### 🔄 `index_sync`
Copy index definitions from a source MongoDB (e.g. Atlas prod) to your local lab DB. Dry-run by default.

> "sync indexes from our prod Atlas to my local MongoDB, dry run first"

## Environment variables

| Variable           | Required | Description                              |
| ------------------ | -------- | ---------------------------------------- |
| `MONGODB_URI`      | Yes      | Connection string for the target MongoDB |
| `MONGODB_DATABASE` | Yes      | Database name to analyze                 |

For Atlas (audit): the URI already includes TLS. Append `?readPreference=secondaryPreferred` to keep load off primary.

For local (lab): `mongodb://localhost:27017` works fine. The lab package refuses anything else.

## Guardrails

Speedwagon is paranoid about your data. Layered defenses:

| Layer | Where | What it does |
|-------|-------|-------------|
| **Package separation** | audit vs lab | The audit package's source never imports MongoDB write APIs. Provable by `grep`. |
| **Read-only proxy** | core | Every collection in the audit package is wrapped in a Proxy that throws on `insertOne`, `deleteMany`, `drop`, and 13 other write methods at the driver level. |
| **Aggregate stage filter** | core | `$out` and `$merge` are rejected before the pipeline runs. |
| **Localhost guard** | lab | The lab package parses `MONGODB_URI` at startup and refuses any non-local host. |
| **Hard limits** | core | `find` caps at 100 docs, `aggregate` caps at 200 results. |

Pair this with a read-only Atlas user and `readPreference=secondaryPreferred` and the blast radius is essentially zero.

## The workflow that actually helps

### Case A — Slow query in production

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

### Case B — Preflight a new collection before launch

```
You:    "sync indexes from prod to my local lab, dry run"
Agent:  [lab: index_sync]    → would create 4 indexes
You:    "apply it"
Agent:  [lab: index_sync]    → 4 indexes created
You:    "seed 200k orders with userId 1-10000, amount 1-100000, status active/pending/refunded"
Agent:  [lab: seed]          → inserted 200000 docs in 18s
You:    "explain_analyze the query our new endpoint will run"
Agent:  [explain_analyze]    → 1.8s, 200k docs examined — needs another index
```

Four messages each. Problem identified, solution ready, no tab switching.

## Tech stack

- TypeScript (project references, npm workspaces)
- `@modelcontextprotocol/sdk` — MCP protocol
- `mongodb` — Node driver
- `zod` — input validation
- `@faker-js/faker` — lab-only synthetic data

## Contributing

Issues and PRs welcome — see the templates under `.github/ISSUE_TEMPLATE/`. This is a side project, so response time is best-effort.

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 Yongtaek Lee.

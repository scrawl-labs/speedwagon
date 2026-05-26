# mongodb-speedwagon

<p align="center">
  <img src=".github/assets/speedwagon.png" width="800"/>
</p>

<p align="center"><em>"You look like you're wonderin' 'why the heck is this query slow?!' Allow me to explain! The name's Speedwagon!"</em></p>

An MCP server that sits between your AI agent and MongoDB. Ask questions about your queries in plain language. Get back explain plans, index suggestions, and slow query reports — without opening Compass or writing `db.collection.explain()` by hand.

## Why this exists

You're staring at a slow endpoint. You know it's a MongoDB query. You open Compass, copy the query, run explain, squint at the output, Google what `COLLSCAN` means again, check which indexes exist, realize the index doesn't cover your sort field, alt-tab back to your editor.

Or you just ask your agent: "why is the users query slow?"

Speedwagon connects, runs explain, reads the plan, checks your indexes, and tells you what's wrong. One conversation. No context switching.

## Install

```bash
cd mongodb-speedwagon
npm install
npm run build
```

Add to `~/.claude/settings.json` (or wherever your MCP config lives):

Create a `.env` file in the project root:

```
MONGODB_URI=mongodb+srv://readonly:pass@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=your_db
```

Add to `~/.claude/settings.json` (or wherever your MCP config lives):

```json
{
  "mcpServers": {
    "mongodb-speedwagon": {
      "command": "node",
      "args": ["/absolute/path/to/mongodb-speedwagon/dist/index.js"]
    }
  }
}
```

Restart your agent. That's it.

## Tools

### 🔍 `explain`

Runs `queryPlanner` mode. Shows whether your query hits an index or does a full collection scan. No data is touched — this is read-only.

> "explain the find query on users where email is test@example.com"

### ⚡ `explain_analyze`

Runs `executionStats` mode. Same as explain, but actually executes the query and returns real numbers — execution time, documents examined, keys examined. **The query runs for real**, so be thoughtful on production.

> "how many documents does MongoDB actually scan for this query?"

### 📋 `index_list`

Lists every index on a collection with its key pattern, uniqueness, and size in bytes. The first thing you should check when a query is slow.

> "what indexes exist on the orders collection?"

### 💡 `index_suggest`

Runs explain under the hood, checks if there's a COLLSCAN, compares against existing indexes, and suggests what to create. Gives you the `createIndex` command ready to copy-paste.

> "suggest an index for querying orders by userId sorted by createdAt"

### 🐢 `slow_queries`

Pulls from `system.profile`. If the profiler isn't enabled, it tells you how to turn it on instead of failing silently.

> "show me queries slower than 200ms on the payments collection"

### 🔎 `find`

Query documents in plain language. No more `node -e "const { MongoClient } = require('mongodb')..."` one-liners. Just ask. Hard-capped at 100 documents per call so you never accidentally dump an entire collection.

> "find the user with email tommy.lee@goorm.io"

> "show me the 10 most recent orders with status pending"

### 🧮 `aggregate`

Run aggregation pipelines. Claude already knows MongoDB's pipeline syntax — you describe what you want, it builds the pipeline, speedwagon executes it. Write stages (`$out`, `$merge`) are blocked. Auto-appends `$limit` if you forget one.

> "group orders by userId and sum the total amount"

> "count signups per day for the last 30 days"

### 🔄 `index_sync`

The one that solves a real operational pain. Copies index definitions from one MongoDB (e.g. your Atlas prod) to another (e.g. your local instance). **Dry run by default** — it shows what it would create without actually creating anything.

> "sync indexes from our prod Atlas to my local MongoDB"

This exists because dev databases rarely have enough data to surface slow queries. The play is:

1. Point speedwagon at local MongoDB
2. Sync indexes from prod/dev Atlas
3. Load test data locally (100k+ docs)
4. Run `explain_analyze` against real volume with real index structures

Same indexes, enough data, no risk to production.

## Environment variables

| Variable           | Required | Description                              |
| ------------------ | -------- | ---------------------------------------- |
| `MONGODB_URI`      | Yes      | Connection string for the target MongoDB |
| `MONGODB_DATABASE` | Yes      | Database name to analyze                 |

For Atlas: your connection string already includes TLS. No extra config needed.

For local: `mongodb://localhost:27017` works fine.

## Guardrails

Speedwagon is paranoid about your data. Three layers of protection:

| Layer | What it does |
|-------|-------------|
| **Read-only proxy** | Every collection is wrapped in a Proxy that blocks `insertOne`, `deleteMany`, `drop`, and 15 other write methods at the driver level |
| **Aggregate stage filter** | `$out` and `$merge` are rejected before the pipeline runs |
| **index_sync locality check** | `dry_run=false` only works when the target is `localhost` — no accidental index creation on remote DBs |
| **Hard limits** | `find` caps at 100 docs, `aggregate` caps at 200 results |

Use a read-only Atlas DB user on top of this and you've got belt, suspenders, and a parachute.

## The workflow that actually helps

**Scenario**: API response time spiked after a deploy.

```
You:    "list indexes on the transactions collection"
Agent:  [calls index_list] → shows 3 indexes

You:    "explain the query that filters by merchantId and sorts by timestamp desc"
Agent:  [calls explain] → "COLLSCAN detected. No index covers merchantId + timestamp."

You:    "suggest an index"
Agent:  [calls index_suggest] → "db.transactions.createIndex({ merchantId: 1, timestamp: -1 })"

You:    "run explain_analyze to see the current damage"
Agent:  [calls explain_analyze] → "542ms, 1.2M docs examined, 47 returned"
```

Four messages. Problem identified, solution ready. No tab switching, no Compass, no copy-pasting explain output into ChatGPT.

## Tech stack

- TypeScript
- `@modelcontextprotocol/sdk` (MCP protocol)
- `mongodb` driver (Node.js)
- `zod` (input validation)

## License

MIT

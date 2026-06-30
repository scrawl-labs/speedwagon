# @scrawl-labs/speedwagon-mongodb

MongoDB MCP server with multi-environment support, SSH tunneling, and whitelist-based read/write guardrails.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-mongodb
```

## Configuration

### Environment Variables

#### Multi-Environment Pattern

Each environment requires a pair of variables:

```
MONGODB_{ENV}_URI       — Connection URI
MONGODB_{ENV}_DATABASE  — Database name
```

`{ENV}` supports underscores for compound names (e.g. `DEV_ORDERS`, `OP_BILLING`).

```bash
MONGODB_DEV_ORDERS_URI="mongodb://localhost:27017/?authSource=admin"
MONGODB_DEV_ORDERS_DATABASE="orders"

MONGODB_OP_ORDERS_URI="mongodb://admin:pass@127.0.0.1:{tunnel_port}/orders?authSource=admin&tls=true&directConnection=true&tlsAllowInvalidHostnames=true"
MONGODB_OP_ORDERS_DATABASE="orders"
```

#### Default Environment

```bash
MONGODB_DEFAULT_ENV="dev_orders"   # override the default (otherwise "dev")
```

#### Legacy Compatibility

Single-environment setup still works:

```bash
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DATABASE="mydb"
```

### Read/Write Mode (Whitelist)

Only environments with known safe prefixes get **readwrite** access. Everything else defaults to **readonly**.

| Prefix | Mode |
|--------|------|
| `dev`, `dev_*` | readwrite |
| `beta`, `beta_*` | readwrite |
| `staging`, `staging_*` | readwrite |
| `local`, `local_*` | readwrite |
| `test`, `test_*` | readwrite |
| **Everything else** | **readonly** |

This means an environment like `MONGODB_ANALYTICS_URI` (no recognized prefix) will be readonly by default — preventing accidental writes to production databases.

### SSH Tunnel

For environments behind a bastion host:

```bash
# Global SSH settings
SSH_HOST="bastion.example.com"
SSH_PORT="22"
SSH_USERNAME="user"
SSH_PASSWORD="pass"

# Per-environment remote target
MONGODB_OP_ORDERS_SSH_REMOTE_HOST="mongo-shard-00.mongodb.net"
MONGODB_OP_ORDERS_SSH_REMOTE_PORT="27017"
```

Use `{tunnel_port}` in the URI — it gets replaced with the actual local tunnel port at runtime.

## MCP Client Configuration

Add to `~/.mcp.json` or project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "speedwagon-mongodb": {
      "command": "speedwagon-mongodb",
      "env": {
        "MONGODB_DEFAULT_ENV": "dev_orders",
        "MONGODB_DEV_ORDERS_URI": "mongodb://localhost:27017/?authSource=admin",
        "MONGODB_DEV_ORDERS_DATABASE": "orders",
        "MONGODB_OP_ORDERS_URI": "mongodb://admin:pass@127.0.0.1:{tunnel_port}/orders?authSource=admin&tls=true",
        "MONGODB_OP_ORDERS_DATABASE": "orders",
        "MONGODB_OP_ORDERS_SSH_REMOTE_HOST": "mongo-shard-00.mongodb.net",
        "SSH_HOST": "bastion.example.com",
        "SSH_USERNAME": "user",
        "SSH_PASSWORD": "pass"
      }
    }
  }
}
```

## Tools

### Environment Management

| Tool | Description |
|------|-------------|
| `list_environments` | List all configured environments and show which is active |
| `switch_env` | Switch the active environment for subsequent calls |

### Query Analysis

| Tool | Description |
|------|-------------|
| `explain` | Query execution plan (queryPlanner mode) — COLLSCAN vs IXSCAN |
| `explain_analyze` | Execution plan with actual stats (documents examined, execution time) |
| `index_list` | List all indexes and their sizes for a collection |
| `index_suggest` | Suggest optimal indexes when COLLSCAN is detected |

### Data Access

| Tool | Description |
|------|-------------|
| `find` | Query documents with filter, sort, projection, limit |
| `aggregate` | Run aggregation pipelines (write stages blocked) |
| `slow_queries` | Query slow operations from the MongoDB profiler |

### Real-Time Monitoring

| Tool | Description |
|------|-------------|
| `current_ops` | Currently running operations — essential for live incident diagnosis |
| `server_status` | Connection count, opcounters, memory, network I/O, lock queue |
| `collection_stats` | Document count, data size, storage size, index sizes |

### Write Operations (readwrite environments only)

| Tool | Description |
|------|-------------|
| `insert` | Insert documents into a collection |
| `update` | Update documents (set `many=true` for updateMany) |
| `delete` | Delete documents (empty filter `{}` rejected for safety) |

All write tools are blocked on readonly environments.

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

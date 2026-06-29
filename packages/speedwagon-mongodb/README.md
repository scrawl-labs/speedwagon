# @scrawl-labs/speedwagon-mongodb

MongoDB MCP server with multi-environment support, SSH tunneling, and read/write guardrails.

This package supports multiple environments (dev, op, etc.) with per-environment read/write modes. The `op` environment is read-only by construction. Other environments support full read/write operations including `insert`, `update`, and `delete`.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-mongodb
```

## Configuration

### Environment Variables

The server supports multi-environment configuration via environment variables.

#### Multi-Environment Pattern

Each environment requires these variables:

- `MONGODB_{ENV}_URI` — MongoDB connection URI (may include `{tunnel_port}` placeholder for SSH-tunneled connections)
- `MONGODB_{ENV}_DATABASE` — Database name for this environment

Example:
```bash
# Dev environment (direct connection)
MONGODB_DEV_URI="mongodb://user:password@localhost:27017/?authSource=admin"
MONGODB_DEV_DATABASE="goorm_ide"

# Op environment (SSH tunneled)
MONGODB_OP_URI="mongodb://goorm_admin:password@127.0.0.1:{tunnel_port}/gem-operation-beta?authSource=admin&tls=true&directConnection=true&tlsAllowInvalidHostnames=true"
MONGODB_OP_DATABASE="gem-operation-beta"
```

#### Legacy Compatibility

For backward compatibility, you can still use:
- `MONGODB_URI` — MongoDB connection URI (defaults to `default` environment)
- `MONGODB_DATABASE` — Database name (defaults to `default` environment)

#### Default Environment

- Default environment is `dev` (if not specified, operations target the `dev` environment)

### SSH Tunnel Configuration

SSH tunneling is supported for environments that need to connect through a jump host.

#### Global SSH Settings

These apply to all environments that use SSH tunneling:

- `SSH_HOST` — SSH server hostname or IP
- `SSH_PORT` — SSH server port (default: 22)
- `SSH_USERNAME` — SSH username for authentication
- `SSH_PASSWORD` — SSH password for authentication

#### Per-Environment SSH Settings

Each environment can specify its remote MongoDB server details:

- `MONGODB_{ENV}_SSH_REMOTE_HOST` — MongoDB host on the remote network (e.g., internal hostname)
- `MONGODB_{ENV}_SSH_REMOTE_PORT` — MongoDB port on the remote network (default: 27017)

When SSH is configured for an environment, the server:
1. Creates a local tunnel through the SSH server
2. Replaces `{tunnel_port}` in the connection URI with the actual local tunnel port
3. Connects to MongoDB through the tunnel

Example configuration:
```bash
# SSH global settings
SSH_HOST="52.79.37.185"
SSH_PORT="22"
SSH_USERNAME="tommy.lee"
SSH_PASSWORD="secretpassword"

# Op environment with SSH
MONGODB_OP_SSH_REMOTE_HOST="goorm-gem-shard-00-01.nqc7m.mongodb.net"
MONGODB_OP_SSH_REMOTE_PORT="27017"
MONGODB_OP_URI="mongodb://goorm_admin:password@127.0.0.1:{tunnel_port}/gem-operation-beta?authSource=admin&tls=true&directConnection=true&tlsAllowInvalidHostnames=true"
MONGODB_OP_DATABASE="gem-operation-beta"
```

### Environment Modes

Each environment has a read/write mode:

- `op` environment — **read-only** (no write operations allowed)
- All other environments (`dev`, etc.) — **read-write** (all operations allowed)

Write operations on read-only environments will return an error:
```
"op" environment is read-only. Write operations are not allowed.
```

## MCP Client Configuration

Add to your MCP client config (e.g. `~/.claude/settings.json`):

### Single Environment (Legacy)

```json
{
  "mcpServers": {
    "speedwagon-mongodb": {
      "command": "speedwagon-mongodb",
      "env": {
        "MONGODB_URI": "mongodb+srv://readonly_user:password@cluster.mongodb.net/?readPreference=secondaryPreferred",
        "MONGODB_DATABASE": "your_db"
      }
    }
  }
}
```

### Multiple Environments (Dev + Op)

```json
{
  "mcpServers": {
    "speedwagon-mongodb": {
      "command": "speedwagon-mongodb",
      "env": {
        "MONGODB_DEV_URI": "mongodb://user:password@localhost:27017/?authSource=admin",
        "MONGODB_DEV_DATABASE": "goorm_ide",
        "MONGODB_OP_URI": "mongodb://goorm_admin:password@127.0.0.1:{tunnel_port}/gem-operation-beta?authSource=admin&tls=true&directConnection=true&tlsAllowInvalidHostnames=true",
        "MONGODB_OP_DATABASE": "gem-operation-beta",
        "SSH_HOST": "52.79.37.185",
        "SSH_PORT": "22",
        "SSH_USERNAME": "tommy.lee",
        "SSH_PASSWORD": "secretpassword",
        "MONGODB_OP_SSH_REMOTE_HOST": "goorm-gem-shard-00-01.nqc7m.mongodb.net",
        "MONGODB_OP_SSH_REMOTE_PORT": "27017"
      }
    }
  }
}
```

## Tools

### Read Tools (All Environments)

- `explain` — Explain query execution plan
- `explain_analyze` — Explain query with execution statistics
- `index_list` — List all indexes in a collection
- `index_suggest` — Suggest missing indexes for a query
- `slow_queries` — Find slow queries in profiler
- `find` — Query documents with optional filters, projection, sorting
- `aggregate` — Run aggregation pipelines

### Write Tools (Dev Environment Only)

- `insert` — Insert documents into a collection
- `update` — Update documents in a collection
- `delete` — Delete documents from a collection

All write tools respect environment mode — attempting to write to the `op` environment will fail with a read-only error.

See [the project README](https://github.com/scrawl-labs/speedwagon#tools) for detailed tool documentation.

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

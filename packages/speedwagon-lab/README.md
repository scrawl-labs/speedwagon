# @scrawl-labs/speedwagon-lab

Local MongoDB lab for speedwagon. Seed synthetic data with [faker](https://fakerjs.dev/), sync indexes from prod, and analyze queries at production scale — without touching prod.

**Localhost only.** The package parses `MONGODB_URI` at startup and refuses any non-local host. Use [`@scrawl-labs/speedwagon`](https://www.npmjs.com/package/@scrawl-labs/speedwagon) for production queries.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-lab
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "speedwagon-lab": {
      "command": "speedwagon-lab",
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017",
        "MONGODB_DATABASE": "speedwagon_lab"
      }
    }
  }
}
```

## Tools

All read-only tools from `@scrawl-labs/speedwagon` (`explain`, `find`, `aggregate`, ...), **plus**:

- `seed` — generate documents with faker
- `clear` — `deleteMany({})` with a confirm guard
- `index_sync` — copy index definitions from a remote source DB

See [the project README](https://github.com/scrawl-labs/mongodb-speedwagon#tools) for the full reference.

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

# @scrawl-labs/speedwagon-mongodb

MongoDB query analyzer MCP server — the **audit** package. Read-only by construction.

This package never imports MongoDB write APIs. The source can be grep'd and you will find no `insertOne`, `createIndex`, or `deleteMany` calls in tool code paths. Every collection is also wrapped in a Proxy that throws on 16 driver-level write methods.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-mongodb
```

Add to your MCP client config (e.g. `~/.claude/settings.json`):

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

## Tools

`explain`, `explain_analyze`, `index_list`, `index_suggest`, `slow_queries`, `find`, `aggregate`.

See [the project README](https://github.com/scrawl-labs/mongodb-speedwagon#tools) for details.

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

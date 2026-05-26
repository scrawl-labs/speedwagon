# @scrawl-labs/speedwagon

MongoDB query analyzer MCP server — the **audit** package. Read-only by construction.

This package never imports MongoDB write APIs. The source can be grep'd and you will find no `insertOne`, `createIndex`, or `deleteMany` calls. Writes live in [`@scrawl-labs/speedwagon-lab`](https://www.npmjs.com/package/@scrawl-labs/speedwagon-lab) and only there.

## Install

```bash
npm install -g @scrawl-labs/speedwagon
```

Add to your MCP client config (e.g. `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "speedwagon": {
      "command": "speedwagon",
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

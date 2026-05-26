# @scrawl-labs/speedwagon-core

Shared internals for [`@scrawl-labs/speedwagon`](https://www.npmjs.com/package/@scrawl-labs/speedwagon) and [`@scrawl-labs/speedwagon-lab`](https://www.npmjs.com/package/@scrawl-labs/speedwagon-lab).

**Not intended for direct use.** Install one of the consumer packages instead.

This package contains:
- The read-only MongoDB client (Proxy that blocks all write methods at the driver level)
- The seven read-only MCP tools: `explain`, `explain_analyze`, `find`, `aggregate`, `index_list`, `index_suggest`, `slow_queries`
- Environment config loader

See the [project README](https://github.com/scrawl-labs/mongodb-speedwagon) for the full picture.

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

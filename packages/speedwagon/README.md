# @scrawl-labs/speedwagon

Shared MCP server infrastructure for the Speedwagon family. Used by the per-backend packages — `@scrawl-labs/speedwagon-mongodb`, `@scrawl-labs/speedwagon-elastic`, `@scrawl-labs/speedwagon-grafana` — to register their tools.

**Not an MCP server itself.** Install one of the backend packages to actually expose tools to your agent.

## What it provides

- `runMcpServer({ name, version, tools, onShutdown? })` — boilerplate for `McpServer` + stdio transport + SIGINT handling.
- `defineTool({ name, description, inputSchema, annotations?, handler })` — type-safe tool descriptors. `inputSchema` is a Zod schema; `handler` receives the parsed input and returns a string.
- `requiredEnv(key)` / `optionalEnv(key, fallback?)` — env helpers that read `process.env` only. The library performs no I/O at import time. For MCP servers, populate env via the host's MCP client config `env` block (e.g. `claude mcp add --env`); for local debugging, use inline env, the MCP Inspector, or `node --env-file=.env`.

## Example

```ts
#!/usr/bin/env node
import { runMcpServer, defineTool, requiredEnv } from "@scrawl-labs/speedwagon";
import { z } from "zod";

const ping = defineTool({
  name: "ping",
  description: "Reply with pong.",
  inputSchema: z.object({}),
  annotations: { readOnlyHint: true },
  handler: async () => "pong",
});

runMcpServer({
  name: "my-backend",
  version: "0.1.0",
  tools: [ping],
}).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
```

## License

MIT — Copyright (c) 2026 Yongtaek Lee.

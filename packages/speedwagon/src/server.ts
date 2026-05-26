import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolDef } from "./tool.js";

export interface RunMcpServerOptions {
  name: string;
  version: string;
  tools: readonly ToolDef[];
  onShutdown?: () => Promise<void> | void;
}

export async function runMcpServer(options: RunMcpServerOptions): Promise<void> {
  const server = new McpServer({ name: options.name, version: options.version });

  for (const tool of options.tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      async (input: unknown) => ({
        content: [{ type: "text" as const, text: await tool.handler(input) }],
      }),
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    if (options.onShutdown) await options.onShutdown();
    process.exit(0);
  });
}

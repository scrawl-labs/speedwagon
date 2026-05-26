import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

export interface StdioUpstream {
  kind: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface HttpUpstream {
  kind: "http";
  url: string;
  headers?: Record<string, string>;
}

export type Upstream = StdioUpstream | HttpUpstream;

export interface ProxyMcpServerOptions {
  name: string;
  version: string;
  upstream: Upstream;
  allow?: (tool: Tool) => boolean;
}

function buildClientTransport(upstream: Upstream) {
  if (upstream.kind === "stdio") {
    return new StdioClientTransport({
      command: upstream.command,
      args: upstream.args,
      env: upstream.env,
    });
  }
  return new StreamableHTTPClientTransport(new URL(upstream.url), {
    requestInit: upstream.headers ? { headers: upstream.headers } : undefined,
  });
}

export async function proxyMcpServer(options: ProxyMcpServerOptions): Promise<void> {
  const client = new Client({
    name: `${options.name}-upstream`,
    version: options.version,
  });
  await client.connect(buildClientTransport(options.upstream));

  const allow = options.allow ?? (() => true);

  const server = new Server(
    { name: options.name, version: options.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const { tools } = await client.listTools();
    return { tools: tools.filter(allow) };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await client.callTool({
      name: request.params.name,
      arguments: request.params.arguments,
    });
    return result as Awaited<ReturnType<typeof client.callTool>>;
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await client.close();
    process.exit(0);
  });
}

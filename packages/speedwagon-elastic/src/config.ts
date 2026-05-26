import { requiredEnv, optionalEnv } from "@scrawl-labs/speedwagon";

function buildMcpUrl(kibanaUrl: string, space: string | undefined): string {
  const base = kibanaUrl.replace(/\/+$/, "");
  return space
    ? `${base}/s/${space}/api/agent_builder/mcp`
    : `${base}/api/agent_builder/mcp`;
}

export const config = {
  mcpUrl: buildMcpUrl(requiredEnv("KIBANA_URL"), optionalEnv("KIBANA_SPACE")),
  apiKey: requiredEnv("ELASTIC_API_KEY"),
} as const;

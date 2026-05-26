import { requiredEnv, optionalEnv } from "@scrawl-labs/speedwagon";

const DEFAULT_COMMAND = "uvx";
const DEFAULT_ARGS = ["mcp-grafana", "-t", "stdio", "--disable-write"];

function parseArgs(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  return raw.trim().split(/\s+/);
}

export const config = {
  grafanaUrl: requiredEnv("GRAFANA_URL"),
  serviceAccountToken: requiredEnv("GRAFANA_SERVICE_ACCOUNT_TOKEN"),
  command: optionalEnv("GRAFANA_MCP_COMMAND") ?? DEFAULT_COMMAND,
  args: parseArgs(optionalEnv("GRAFANA_MCP_ARGS")) ?? DEFAULT_ARGS,
} as const;

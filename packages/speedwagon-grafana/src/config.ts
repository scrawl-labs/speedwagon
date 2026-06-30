import { requiredEnv } from "@scrawl-labs/speedwagon";

export const config = {
  grafanaUrl: requiredEnv("GRAFANA_URL").replace(/\/+$/, ""),
  token: requiredEnv("GRAFANA_SERVICE_ACCOUNT_TOKEN"),
} as const;

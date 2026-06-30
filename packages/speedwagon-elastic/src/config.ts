import { requiredEnv } from "@scrawl-labs/speedwagon";

export const config = {
  elasticUrl: requiredEnv("ELASTICSEARCH_URL").replace(/\/+$/, ""),
  apiKey: requiredEnv("ELASTICSEARCH_API_KEY"),
} as const;

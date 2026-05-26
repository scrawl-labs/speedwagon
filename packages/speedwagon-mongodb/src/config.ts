import { requiredEnv } from "@scrawl-labs/speedwagon";

export const config = {
  mongoUri: requiredEnv("MONGODB_URI"),
  database: requiredEnv("MONGODB_DATABASE"),
} as const;

import { z } from "zod";
import { setCurrentEnv, getDefaultEnv, getEnvDetails } from "../config.js";

export const switchEnvSchema = z.object({
  env: z.string().describe("Environment name to switch to (e.g. dev, op, staging)"),
});

export type SwitchEnvInput = z.infer<typeof switchEnvSchema>;

export async function switchEnv(input: SwitchEnvInput): Promise<string> {
  const previous = getDefaultEnv();
  setCurrentEnv(input.env);
  const current = getDefaultEnv();
  const details = getEnvDetails().find((e) => e.name === current);

  return JSON.stringify({
    switched: { from: previous, to: current },
    database: details?.database,
    mode: details?.mode,
  }, null, 2);
}

import { z } from "zod";
import { getDefaultEnv, getEnvDetails } from "../config.js";

export const listEnvironmentsSchema = z.object({});

export async function listEnvironments(): Promise<string> {
  const current = getDefaultEnv();
  const envs = getEnvDetails();

  if (envs.length === 0) {
    return JSON.stringify({
      message: "No environments configured. Set MONGODB_{ENV}_URI and MONGODB_{ENV}_DATABASE environment variables.",
      environments: [],
    }, null, 2);
  }

  const environments = envs.map((env) => ({
    ...env,
    active: env.name === current,
  }));

  return JSON.stringify({
    current,
    environments,
  }, null, 2);
}

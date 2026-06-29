export type EnvMode = "readonly" | "readwrite";

export interface EnvConfig {
  name: string;
  uri: string;
  database: string;
  mode: EnvMode;
  ssh?: {
    remoteHost: string;
    remotePort: number;
  };
}

export interface SshGlobalConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface ParsedConfig {
  environments: Map<string, EnvConfig>;
  defaultEnv: string;
  sshConfig: SshGlobalConfig | null;
}

const READONLY_ENVS = new Set(["op", "prod"]);

const URI_PATTERN = /^MONGODB_([A-Z0-9]+)_URI$/;

export function parseConfig(env: NodeJS.ProcessEnv): ParsedConfig {
  const environments = new Map<string, EnvConfig>();

  // Parse SSH global config
  const sshConfig: SshGlobalConfig | null = env.SSH_HOST
    ? {
        host: env.SSH_HOST,
        port: parseInt(env.SSH_PORT ?? "22", 10),
        username: env.SSH_USERNAME ?? "",
        password: env.SSH_PASSWORD ?? "",
      }
    : null;

  // Scan for MONGODB_{ENV}_URI patterns
  for (const [key, value] of Object.entries(env)) {
    const match = key.match(URI_PATTERN);
    if (!match || !value) continue;

    const envKey = match[1];
    const envName = envKey.toLowerCase();
    const database = env[`MONGODB_${envKey}_DATABASE`];
    if (!database) continue;

    const remoteHost = env[`MONGODB_${envKey}_SSH_REMOTE_HOST`];
    const remotePort = env[`MONGODB_${envKey}_SSH_REMOTE_PORT`];

    environments.set(envName, {
      name: envName,
      uri: value,
      database,
      mode: READONLY_ENVS.has(envName) ? "readonly" : "readwrite",
      ssh: remoteHost
        ? { remoteHost, remotePort: parseInt(remotePort ?? "27017", 10) }
        : undefined,
    });
  }

  // Legacy fallback: MONGODB_URI + MONGODB_DATABASE (only when no multi-env vars found)
  let defaultEnv = "dev";
  if (environments.size === 0 && env.MONGODB_URI && env.MONGODB_DATABASE) {
    environments.set("default", {
      name: "default",
      uri: env.MONGODB_URI,
      database: env.MONGODB_DATABASE,
      mode: "readwrite",
    });
    defaultEnv = "default";
  }

  // Allow explicit override of default environment
  if (env.MONGODB_DEFAULT_ENV) {
    defaultEnv = env.MONGODB_DEFAULT_ENV.toLowerCase();
  }

  return { environments, defaultEnv, sshConfig };
}

// --- Runtime module-level exports (use process.env at load time) ---

const _parsed = parseConfig(process.env);

export function getEnvConfig(envName: string): EnvConfig {
  const cfg = _parsed.environments.get(envName);
  if (!cfg) {
    const available = [..._parsed.environments.keys()].join(", ");
    throw new Error(
      `Unknown environment "${envName}". Available: ${available || "(none)"}`
    );
  }
  return cfg;
}

export function getDefaultEnv(): string {
  return _parsed.defaultEnv;
}

export function listEnvs(): string[] {
  return [..._parsed.environments.keys()];
}

export const sshConfig: SshGlobalConfig | null = _parsed.sshConfig;

export function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is not set.`);
  }
  return value;
}

export function optionalEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

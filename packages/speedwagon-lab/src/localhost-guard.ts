const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "host.docker.internal",
]);

export function assertLocalUri(uri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(`speedwagon-lab: invalid MONGODB_URI ("${uri}").`);
  }

  const host = parsed.hostname;
  const isLocal = LOCAL_HOSTS.has(host) || host.endsWith(".local");

  if (!isLocal) {
    throw new Error(
      `speedwagon-lab refuses non-local host "${host}". ` +
        `Lab mode is for a local mongod only. ` +
        `If you meant to run against a remote DB, use @scrawl-labs/speedwagon (read-only) instead.`
    );
  }
}

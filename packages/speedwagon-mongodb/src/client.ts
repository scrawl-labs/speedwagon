import { MongoClient, type Db, type Collection } from "mongodb";
import { getEnvConfig, getDefaultEnv, type EnvMode } from "./config.js";
import { ensureTunnel, shutdownTunnels } from "./ssh-tunnel.js";

const BLOCKED_METHODS = new Set([
  "insertOne",
  "insertMany",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "replaceOne",
  "findOneAndUpdate",
  "findOneAndReplace",
  "findOneAndDelete",
  "bulkWrite",
  "drop",
  "rename",
  "createIndex",
  "dropIndex",
  "dropIndexes",
]);

function createReadOnlyCollection(collection: Collection): Collection {
  return new Proxy(collection, {
    get(target, prop) {
      if (typeof prop === "string" && BLOCKED_METHODS.has(prop)) {
        return () => {
          throw new Error(
            `Write operation "${prop}" is blocked. This environment runs in read-only mode.`
          );
        };
      }
      return Reflect.get(target, prop);
    },
  });
}

function createReadOnlyDb(db: Db): Db {
  return new Proxy(db, {
    get(target, prop) {
      if (prop === "collection") {
        return (...args: Parameters<Db["collection"]>) => {
          const col = target.collection(...args);
          return createReadOnlyCollection(col);
        };
      }
      if (
        prop === "dropCollection" ||
        prop === "dropDatabase" ||
        prop === "createCollection"
      ) {
        return () => {
          throw new Error(
            `Destructive operation "${String(prop)}" is blocked. This environment runs in read-only mode.`
          );
        };
      }
      return Reflect.get(target, prop);
    },
  });
}

interface CachedClient {
  client: MongoClient;
  db: Db;
  mode: EnvMode;
}

const clients = new Map<string, CachedClient>();

export async function getDb(
  envName?: string
): Promise<{ db: Db; mode: EnvMode }> {
  const env = envName ?? getDefaultEnv();

  // Cache hit
  const cached = clients.get(env);
  if (cached) return { db: cached.db, mode: cached.mode };

  const cfg = getEnvConfig(env);
  let uri = cfg.uri;

  // SSH tunnel if needed
  if (cfg.ssh) {
    const localPort = await ensureTunnel(cfg.ssh.remoteHost, cfg.ssh.remotePort);
    uri = uri.replace("{tunnel_port}", String(localPort));
  }

  const client = new MongoClient(uri, {
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
  });
  await client.connect();

  const rawDb = client.db(cfg.database);
  const db = cfg.mode === "readonly" ? createReadOnlyDb(rawDb) : rawDb;

  clients.set(env, { client, db, mode: cfg.mode });
  return { db, mode: cfg.mode };
}

export async function closeAll(): Promise<void> {
  for (const [, cached] of clients) {
    await cached.client.close();
  }
  clients.clear();
  await shutdownTunnels();
}

import { MongoClient, Db, Collection } from "mongodb";
import { config } from "./config.js";

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
            `Write operation "${prop}" is blocked. Speedwagon runs in read-only mode.`
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
      if (prop === "dropCollection" || prop === "dropDatabase" || prop === "createCollection") {
        return () => {
          throw new Error(
            `Destructive operation "${String(prop)}" is blocked. Speedwagon runs in read-only mode.`
          );
        };
      }
      return Reflect.get(target, prop);
    },
  });
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = createReadOnlyDb(client.db(config.database));
  return db;
}

export async function getRawDb(): Promise<Db> {
  if (!client) {
    client = new MongoClient(config.mongoUri);
    await client.connect();
  }
  return client.db(config.database);
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

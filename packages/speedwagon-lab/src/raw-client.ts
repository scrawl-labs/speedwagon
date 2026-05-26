import { MongoClient, type Db } from "mongodb";
import { config } from "@scrawl-labs/speedwagon-core";
import { assertLocalUri } from "./localhost-guard.js";

let client: MongoClient | null = null;

export async function getRawDb(): Promise<Db> {
  if (client) return client.db(config.database);

  assertLocalUri(config.mongoUri);

  client = new MongoClient(config.mongoUri);
  await client.connect();
  return client.db(config.database);
}

export async function closeRawDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

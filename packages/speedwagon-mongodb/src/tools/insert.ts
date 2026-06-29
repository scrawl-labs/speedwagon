import { z } from "zod";
import { getDb } from "../client.js";
import { getDefaultEnv } from "../config.js";

export const insertSchema = z.object({
  env: z.string().optional().describe(`Target environment. Defaults to "${getDefaultEnv()}". Blocked on readonly environments (op).`),
  collection: z.string().describe("Collection name"),
  documents: z.string().describe("Array of documents as JSON (e.g. [{ \"name\": \"test\" }])"),
});

export type InsertInput = z.infer<typeof insertSchema>;

export async function insert(input: InsertInput): Promise<string> {
  const { db, mode } = await getDb(input.env);
  const env = input.env || getDefaultEnv();

  if (mode === "readonly") {
    throw new Error(`"${env}" environment is read-only. Write operations are not allowed.`);
  }

  const collection = db.collection(input.collection);
  const docs = JSON.parse(input.documents) as Record<string, unknown>[];

  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error("documents must be a non-empty JSON array.");
  }

  const result = await collection.insertMany(docs);

  return JSON.stringify({
    environment: env,
    insertedCount: result.insertedCount,
    insertedIds: result.insertedIds,
  }, null, 2);
}

import { z } from "zod";
import { getDb } from "../client.js";
import { getDefaultEnv } from "../config.js";

export const indexListSchema = z.object({
  env: z.string().optional().describe(`Target environment. Defaults to "${getDefaultEnv()}".`),
  collection: z.string().describe("Collection name"),
});

export type IndexListInput = z.infer<typeof indexListSchema>;

export async function indexList(input: IndexListInput): Promise<string> {
  const { db } = await getDb(input.env);
  const collection = db.collection(input.collection);

  const indexes = await collection.indexes();
  const stats = await collection.aggregate([{ $collStats: { storageStats: {} } }]).toArray();

  const indexSizes = (stats[0]?.storageStats as Record<string, unknown>)?.indexSizes as Record<string, number> | undefined;

  const result = indexes.map((idx) => ({
    name: idx.name,
    key: idx.key,
    unique: idx.unique ?? false,
    sparse: idx.sparse ?? false,
    sizeBytes: indexSizes?.[idx.name as string] ?? null,
  }));

  return JSON.stringify(result, null, 2);
}

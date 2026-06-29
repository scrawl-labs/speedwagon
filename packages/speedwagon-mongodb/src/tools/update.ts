import { z } from "zod";
import { getDb } from "../client.js";
import { getDefaultEnv } from "../config.js";

export const updateSchema = z.object({
  env: z.string().optional().describe(`Target environment. Defaults to "${getDefaultEnv()}". Blocked on readonly environments (op).`),
  collection: z.string().describe("Collection name"),
  filter: z.string().describe('Query filter as JSON (e.g. {"status": "draft"})'),
  update: z.string().describe('Update operation as JSON (e.g. {"$set": {"status": "published"}})'),
  many: z.boolean().optional().default(false).describe("If true, update all matching documents. Default: false (updateOne)."),
});

export type UpdateInput = z.infer<typeof updateSchema>;

export async function update(input: UpdateInput): Promise<string> {
  const { db, mode } = await getDb(input.env);
  const env = input.env || getDefaultEnv();

  if (mode === "readonly") {
    throw new Error(`"${env}" environment is read-only. Write operations are not allowed.`);
  }

  const collection = db.collection(input.collection);
  const filter = JSON.parse(input.filter);
  const updateDoc = JSON.parse(input.update);

  const result = input.many
    ? await collection.updateMany(filter, updateDoc)
    : await collection.updateOne(filter, updateDoc);

  return JSON.stringify({
    environment: env,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId,
  }, null, 2);
}

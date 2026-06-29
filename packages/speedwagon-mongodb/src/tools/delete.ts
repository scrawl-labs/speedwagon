import { z } from "zod";
import { getDb } from "../client.js";
import { getDefaultEnv } from "../config.js";

export const deleteSchema = z.object({
  env: z.string().optional().describe(`Target environment. Defaults to "${getDefaultEnv()}". Blocked on readonly environments (op).`),
  collection: z.string().describe("Collection name"),
  filter: z.string().describe('Query filter as JSON. Must not be empty {} to prevent accidental full deletion.'),
  many: z.boolean().optional().default(false).describe("If true, delete all matching documents. Default: false (deleteOne)."),
});

export type DeleteInput = z.infer<typeof deleteSchema>;

export async function del(input: DeleteInput): Promise<string> {
  const { db, mode } = await getDb(input.env);
  const env = input.env || getDefaultEnv();

  if (mode === "readonly") {
    throw new Error(`"${env}" environment is read-only. Write operations are not allowed.`);
  }

  const collection = db.collection(input.collection);
  const filter = JSON.parse(input.filter);

  // Safety: block empty filter to prevent accidental full deletion
  if (Object.keys(filter).length === 0) {
    throw new Error("Empty filter {} is not allowed for delete operations. Provide a specific filter.");
  }

  const result = input.many
    ? await collection.deleteMany(filter)
    : await collection.deleteOne(filter);

  return JSON.stringify({
    environment: env,
    deletedCount: result.deletedCount,
  }, null, 2);
}

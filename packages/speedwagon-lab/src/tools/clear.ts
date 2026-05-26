import { z } from "zod";
import { getRawDb } from "../raw-client.js";

export const clearSchema = z.object({
  collection: z.string().describe("Collection name to clear"),
  confirm: z
    .boolean()
    .describe("Must be true to proceed. Safety guard against accidental clears."),
});

export type ClearInput = z.infer<typeof clearSchema>;

export async function clear(input: ClearInput): Promise<string> {
  if (!input.confirm) {
    throw new Error(
      "clear: refusing to delete documents because confirm=false. " +
        "Pass confirm: true to proceed."
    );
  }

  const db = await getRawDb();
  const collection = db.collection(input.collection);

  const beforeCount = await collection.estimatedDocumentCount();
  const result = await collection.deleteMany({});

  return JSON.stringify(
    {
      collection: input.collection,
      countBeforeDelete: beforeCount,
      deletedCount: result.deletedCount,
    },
    null,
    2
  );
}

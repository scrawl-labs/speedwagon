import { z } from "zod";
import { getDb } from "../client.js";

const BLOCKED_STAGES = new Set(["$out", "$merge"]);

export const aggregateSchema = z.object({
  collection: z.string().describe("Collection name"),
  pipeline: z.string().describe("Aggregation pipeline as JSON array (e.g. [{\"$match\": {\"status\": \"active\"}}, {\"$group\": {\"_id\": \"$userId\", \"total\": {\"$sum\": \"$amount\"}}}])"),
  limit: z.number().optional().default(50).describe("Maximum number of results (default: 50, max: 200). Appended as $limit if not already in pipeline"),
});

export type AggregateInput = z.infer<typeof aggregateSchema>;

export async function aggregate(input: AggregateInput): Promise<string> {
  const { db } = await getDb();
  const collection = db.collection(input.collection);

  const pipeline = JSON.parse(input.pipeline) as Record<string, unknown>[];

  for (const stage of pipeline) {
    const stageKey = Object.keys(stage)[0];
    if (BLOCKED_STAGES.has(stageKey)) {
      throw new Error(
        `Stage "${stageKey}" is blocked. Speedwagon runs in read-only mode.`
      );
    }
  }

  const hasLimit = pipeline.some((s) => "$limit" in s);
  if (!hasLimit) {
    pipeline.push({ $limit: Math.min(input.limit ?? 50, 200) });
  }

  const results = await collection.aggregate(pipeline).toArray();

  return JSON.stringify({
    count: results.length,
    results,
  }, null, 2);
}

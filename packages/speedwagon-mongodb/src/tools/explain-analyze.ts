import { z } from "zod";
import { getDb } from "../client.js";

export const explainAnalyzeSchema = z.object({
  collection: z.string().describe("Collection name"),
  filter: z.string().describe("Query filter as JSON"),
  sort: z.string().optional().describe("Sort condition as JSON"),
  projection: z.string().optional().describe("Projection as JSON"),
});

export type ExplainAnalyzeInput = z.infer<typeof explainAnalyzeSchema>;

export async function explainAnalyze(input: ExplainAnalyzeInput): Promise<string> {
  const { db } = await getDb();
  const collection = db.collection(input.collection);

  const filter = JSON.parse(input.filter);
  const sort = input.sort ? JSON.parse(input.sort) : undefined;
  const projection = input.projection ? JSON.parse(input.projection) : undefined;

  let cursor = collection.find(filter);
  if (sort) cursor = cursor.sort(sort);
  if (projection) cursor = cursor.project(projection);

  const result = await cursor.explain("executionStats");

  const stats = (result as Record<string, unknown>).executionStats as Record<string, unknown> | undefined;
  const summary = stats
    ? {
        executionTimeMillis: stats.executionTimeMillis,
        totalDocsExamined: stats.totalDocsExamined,
        totalKeysExamined: stats.totalKeysExamined,
        nReturned: stats.nReturned,
      }
    : null;

  return JSON.stringify({ summary, full: result }, null, 2);
}

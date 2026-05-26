import { z } from "zod";
import { getDb } from "../mongo-client.js";

export const explainSchema = z.object({
  collection: z.string().describe("Collection name"),
  filter: z.string().describe("Query filter as JSON (e.g. {\"email\": \"test@example.com\"})"),
  sort: z.string().optional().describe("Sort condition as JSON (e.g. {\"createdAt\": -1})"),
  projection: z.string().optional().describe("Projection as JSON (e.g. {\"name\": 1, \"email\": 1})"),
});

export type ExplainInput = z.infer<typeof explainSchema>;

export async function explain(input: ExplainInput): Promise<string> {
  const db = await getDb();
  const collection = db.collection(input.collection);

  const filter = JSON.parse(input.filter);
  const sort = input.sort ? JSON.parse(input.sort) : undefined;
  const projection = input.projection ? JSON.parse(input.projection) : undefined;

  let cursor = collection.find(filter);
  if (sort) cursor = cursor.sort(sort);
  if (projection) cursor = cursor.project(projection);

  const result = await cursor.explain("queryPlanner");
  return JSON.stringify(result, null, 2);
}

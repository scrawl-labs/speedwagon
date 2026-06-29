import { z } from "zod";
import { getDb } from "../client.js";

export const findSchema = z.object({
  collection: z.string().describe("Collection name"),
  filter: z.string().describe("Query filter as JSON (e.g. {\"email\": \"test@example.com\"})"),
  sort: z.string().optional().describe("Sort condition as JSON (e.g. {\"createdAt\": -1})"),
  projection: z.string().optional().describe("Projection as JSON (e.g. {\"name\": 1, \"email\": 1})"),
  limit: z.number().optional().default(20).describe("Maximum number of documents to return (default: 20, max: 100)"),
});

export type FindInput = z.infer<typeof findSchema>;

export async function find(input: FindInput): Promise<string> {
  const { db } = await getDb();
  const collection = db.collection(input.collection);

  const filter = JSON.parse(input.filter);
  const sort = input.sort ? JSON.parse(input.sort) : undefined;
  const projection = input.projection ? JSON.parse(input.projection) : undefined;
  const limit = Math.min(input.limit ?? 20, 100);

  let cursor = collection.find(filter);
  if (sort) cursor = cursor.sort(sort);
  if (projection) cursor = cursor.project(projection);
  cursor = cursor.limit(limit);

  const docs = await cursor.toArray();

  return JSON.stringify({
    count: docs.length,
    documents: docs,
  }, null, 2);
}

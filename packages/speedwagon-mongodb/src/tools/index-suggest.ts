import { z } from "zod";
import { getDb } from "../client.js";

export const indexSuggestSchema = z.object({
  collection: z.string().describe("Collection name"),
  filter: z.string().describe("Query filter as JSON"),
  sort: z.string().optional().describe("Sort condition as JSON"),
});

export type IndexSuggestInput = z.infer<typeof indexSuggestSchema>;

export async function indexSuggest(input: IndexSuggestInput): Promise<string> {
  const db = await getDb();
  const collection = db.collection(input.collection);

  const filter = JSON.parse(input.filter);
  const sort = input.sort ? JSON.parse(input.sort) : undefined;

  let cursor = collection.find(filter);
  if (sort) cursor = cursor.sort(sort);

  const explainResult = await cursor.explain("queryPlanner") as Record<string, unknown>;
  const indexes = await collection.indexes();

  const winningPlan = extractWinningPlan(explainResult);
  const isCollScan = JSON.stringify(winningPlan).includes("COLLSCAN");

  const filterKeys = Object.keys(filter);
  const sortKeys = sort ? Object.keys(sort) : [];

  const existingIndexKeys = indexes.map((idx) => Object.keys(idx.key));
  const alreadyCovered = existingIndexKeys.some((keys) =>
    filterKeys.every((fk) => keys.includes(fk)) &&
    sortKeys.every((sk) => keys.includes(sk))
  );

  const suggestions: string[] = [];

  if (isCollScan) {
    suggestions.push("COLLSCAN detected: full collection scan is occurring.");
  }

  if (!alreadyCovered) {
    const suggestedKey: Record<string, number> = {};
    for (const key of filterKeys) {
      suggestedKey[key] = 1;
    }
    for (const key of sortKeys) {
      suggestedKey[key] = sort![key] as number;
    }

    suggestions.push(
      `Suggested index: ${JSON.stringify(suggestedKey)}`,
      `Create command: db.${input.collection}.createIndex(${JSON.stringify(suggestedKey)})`
    );
  } else {
    suggestions.push("This query is already covered by existing indexes.");
  }

  return JSON.stringify(
    {
      isCollScan,
      alreadyCovered,
      suggestions,
      winningPlan,
      existingIndexes: indexes.map((i) => ({ name: i.name, key: i.key })),
    },
    null,
    2
  );
}

function extractWinningPlan(explain: Record<string, unknown>): unknown {
  const qp = explain.queryPlanner as Record<string, unknown> | undefined;
  return qp?.winningPlan ?? explain;
}
